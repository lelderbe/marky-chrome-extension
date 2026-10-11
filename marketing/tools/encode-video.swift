import Foundation
import AVFoundation
import CoreVideo
import CoreGraphics
import ImageIO

struct Frame: Decodable { let file: String; let duration: Double }
enum VideoError: Error { case failed(String) }
let args=CommandLine.arguments
guard args.count==3 else { throw VideoError.failed("Usage: encode-video.swift timeline.json output.mp4") }
let frames=try JSONDecoder().decode([Frame].self,from:Data(contentsOf:URL(fileURLWithPath:args[1])))
let output=URL(fileURLWithPath:args[2])
if FileManager.default.fileExists(atPath:output.path){try FileManager.default.removeItem(at:output)}
let width=1280, height=800, fps=30
let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:width,AVVideoHeightKey:height,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:3000000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoMaxKeyFrameIntervalKey:30]])
input.expectsMediaDataInRealTime=false
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:width,kCVPixelBufferHeightKey as String:height,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
guard writer.canAdd(input) else {throw VideoError.failed("Cannot add video track")}
writer.add(input)
guard writer.startWriting() else {throw writer.error ?? VideoError.failed("Cannot start writer")}
writer.startSession(atSourceTime:.zero)
var previousFrameCount=0, elapsed=0.0
for frame in frames {
 guard let source=CGImageSourceCreateWithURL(URL(fileURLWithPath:frame.file) as CFURL,nil),let image=CGImageSourceCreateImageAtIndex(source,0,nil) else {throw VideoError.failed("Cannot read image "+frame.file)}
 var pixel: CVPixelBuffer?
 guard CVPixelBufferCreate(kCFAllocatorDefault,width,height,kCVPixelFormatType_32BGRA,nil,&pixel)==kCVReturnSuccess,let buffer=pixel else {throw VideoError.failed("Cannot allocate pixel buffer")}
 CVPixelBufferLockBaseAddress(buffer,[])
 guard let context=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:width,height:height,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) else {throw VideoError.failed("Cannot create bitmap context")}
 context.draw(image,in:CGRect(x:0,y:0,width:width,height:height))
 CVPixelBufferUnlockBaseAddress(buffer,[])
 elapsed+=frame.duration
 let endFrameCount=Int((elapsed*Double(fps)).rounded())
 for index in previousFrameCount..<endFrameCount {
  while !input.isReadyForMoreMediaData {
   if writer.status == .failed {throw writer.error ?? VideoError.failed("Writer failed")}
   Thread.sleep(forTimeInterval:0.002)
  }
  guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(index),timescale:Int32(fps))) else {throw writer.error ?? VideoError.failed("Cannot append frame")}
 }
 previousFrameCount=endFrameCount
}
input.markAsFinished()
writer.endSession(atSourceTime:CMTime(value:Int64(previousFrameCount),timescale:Int32(fps)))
let finished=DispatchSemaphore(value:0)
writer.finishWriting {finished.signal()}
finished.wait()
guard writer.status == .completed else {throw writer.error ?? VideoError.failed("Incomplete video")}
print("Created \(output.lastPathComponent): \(previousFrameCount) frames, \(elapsed) seconds, \(width)×\(height), H.264")

// Decode representative frames for visual QA, including orientation and text.
let asset=AVURLAsset(url:output), generator=AVAssetImageGenerator(asset:asset)
generator.appliesPreferredTrackTransform=true
let qaDir=URL(fileURLWithPath:frames[0].file).deletingLastPathComponent().appendingPathComponent("qa-"+output.deletingLastPathComponent().lastPathComponent)
try FileManager.default.createDirectory(at:qaDir,withIntermediateDirectories:true)
for seconds in [0.0,5.0,8.6,12.8,14.0,16.0] {
 let image=try generator.copyCGImage(at:CMTime(seconds:seconds,preferredTimescale:600),actualTime:nil)
 let url=qaDir.appendingPathComponent("qa-\(Int(seconds*10)).png")
 guard let destination=CGImageDestinationCreateWithURL(url as CFURL,"public.png" as CFString,1,nil) else {throw VideoError.failed("Cannot save decoded frame")}
 CGImageDestinationAddImage(destination,image,nil)
 guard CGImageDestinationFinalize(destination) else {throw VideoError.failed("Cannot finish decoded frame")}
}
