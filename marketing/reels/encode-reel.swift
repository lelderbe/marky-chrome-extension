// Encodes 1080×1920 frames into H.264 and places AAC voice clips at their start times.
// Usage: swift encode-reel.swift <frames-dir> <fps> <audio.json> <output.mp4>
import Foundation
import AVFoundation
import CoreVideo
import CoreGraphics
import ImageIO

struct Clip: Decodable { let file: String; let start: Double }
enum ReelError: Error { case failed(String) }
let args = CommandLine.arguments
guard args.count == 5, let fps = Int32(args[2]) else { throw ReelError.failed("Usage: encode-reel.swift frames-dir fps audio.json output.mp4") }
let framesDir = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[4])
let clips = try JSONDecoder().decode([Clip].self, from: Data(contentsOf: URL(fileURLWithPath: args[3])))
let files = try FileManager.default.contentsOfDirectory(atPath: framesDir.path).filter { $0.hasSuffix(".jpg") }.sorted()
let width = 1080, height = 1920
let silent = output.deletingPathExtension().appendingPathExtension("video.mp4")
for url in [silent, output] where FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }

// Video track.
let writer = try AVAssetWriter(outputURL: silent, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: Int(fps)]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height])
writer.add(input)
guard writer.startWriting() else { throw writer.error ?? ReelError.failed("Cannot start writer") }
writer.startSession(atSourceTime: .zero)
for (index, file) in files.enumerated() {
  guard let source = CGImageSourceCreateWithURL(framesDir.appendingPathComponent(file) as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw ReelError.failed("Cannot read " + file) }
  guard let pool = adaptor.pixelBufferPool else { throw ReelError.failed("No pixel buffer pool") }
  var pixel: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixel)
  guard let buffer = pixel else { throw ReelError.failed("Cannot allocate pixel buffer") }
  CVPixelBufferLockBaseAddress(buffer, [])
  let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
  context?.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  CVPixelBufferUnlockBaseAddress(buffer, [])
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
  guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(index), timescale: fps)) else { throw writer.error ?? ReelError.failed("Cannot append frame") }
}
input.markAsFinished()
let duration = CMTime(value: Int64(files.count), timescale: fps)
writer.endSession(atSourceTime: duration)
let written = DispatchSemaphore(value: 0)
writer.finishWriting { written.signal() }
written.wait()
guard writer.status == .completed else { throw writer.error ?? ReelError.failed("Incomplete video") }

if clips.isEmpty {
  try FileManager.default.moveItem(at: silent, to: output)
  print("Created \(output.lastPathComponent): \(files.count) frames, no audio")
  exit(0)
}

// Mix voice clips into one continuous track: pauses are real silence, not empty edits,
// because many players (browsers, upload pipelines) ignore MP4 edit lists and would glue phrases together.
let sampleRate = 44100.0
let mixFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
let totalFrames = AVAudioFrameCount(duration.seconds * sampleRate)
let mix = AVAudioPCMBuffer(pcmFormat: mixFormat, frameCapacity: totalFrames)!
mix.frameLength = totalFrames
let mixData = mix.floatChannelData![0]
for i in 0..<Int(totalFrames) { mixData[i] = 0 }
for clip in clips {
  let file = try AVAudioFile(forReading: URL(fileURLWithPath: clip.file), commonFormat: .pcmFormatFloat32, interleaved: false)
  guard file.processingFormat.sampleRate == sampleRate else { throw ReelError.failed("Expected 44.1 kHz: " + clip.file) }
  let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))!
  try file.read(into: buffer)
  let offset = Int(clip.start * sampleRate), source = buffer.floatChannelData![0], count = Int(buffer.frameLength)
  // Remove rumble below ~80 Hz with a one-pole high-pass filter.
  let rc = 1.0 / (2 * Double.pi * 80), alpha = Float(rc / (rc + 1 / sampleRate))
  var clean = [Float](repeating: 0, count: count), prevIn: Float = 0, prevOut: Float = 0
  for i in 0..<count { prevOut = alpha * (prevOut + source[i] - prevIn); prevIn = source[i]; clean[i] = prevOut }
  // Level every line to the same speech loudness (RMS of voiced 10 ms windows ≈ −20 dBFS), peaks kept under −1 dBFS.
  let window = Int(sampleRate * 0.01)
  let levels = stride(from: 0, to: count, by: window).map { start -> Float in
    let end = min(start + window, count); var sum: Float = 0
    for i in start..<end { sum += clean[i] * clean[i] }
    return sqrt(sum / Float(end - start))
  }
  let voiced = levels.filter { $0 > (levels.max() ?? 0) * 0.1 }
  let rms = sqrt(voiced.reduce(0) { $0 + $1 * $1 } / Float(max(voiced.count, 1)))
  let peak = clean.map(abs).max() ?? 1
  let gain = min(0.1 / max(rms, 1e-6), 0.89 / max(peak, 1e-6))
  for i in 0..<count where offset + i < Int(totalFrames) { mixData[offset + i] += clean[i] * gain }
}
let voiceURL = output.deletingPathExtension().appendingPathExtension("voice.m4a")
if FileManager.default.fileExists(atPath: voiceURL.path) { try FileManager.default.removeItem(at: voiceURL) }
do {
  let voiceFile = try AVAudioFile(forWriting: voiceURL, settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: sampleRate, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 160000], commonFormat: .pcmFormatFloat32, interleaved: false)
  try voiceFile.write(from: mix)
}

// Mux the video and the continuous voice track without re-encoding either.
let composition = AVMutableComposition()
let video = AVURLAsset(url: silent), voice = AVURLAsset(url: voiceURL)
let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: try await video.loadTracks(withMediaType: .video)[0], at: .zero)
let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
let voiceLength = CMTimeMinimum(try await voice.load(.duration), duration)
try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: voiceLength), of: try await voice.loadTracks(withMediaType: .audio)[0], at: .zero)
guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough) else { throw ReelError.failed("Cannot export") }
try await export.export(to: output, as: .mp4)
try FileManager.default.removeItem(at: silent)
try FileManager.default.removeItem(at: voiceURL)
print("Created \(output.lastPathComponent): \(files.count) frames at \(fps) fps with \(clips.count) voice clips")
