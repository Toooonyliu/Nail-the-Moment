// Run from the repository root on macOS: swift scripts/generate-phone-qr.swift
// Core Image generates the QR codes; Vision decodes each exported PNG to verify it.
import Foundation
import CoreImage
import CoreGraphics
import ImageIO
import Vision

let imageContext = CIContext()
for screen in ["studio", "moments", "saved"] {
    let link = "https://toooonyliu.github.io/Nail-the-Moment/demo/?phone=1&demo=1&screen=\(screen)"
    let filter = CIFilter(name: "CIQRCodeGenerator")!
    filter.setValue(Data(link.utf8), forKey: "inputMessage")
    filter.setValue("M", forKey: "inputCorrectionLevel")
    let code = filter.outputImage!
    let moduleScale = 10
    let padding = 4 * moduleScale
    let pixels = Int(code.extent.width) * moduleScale
    let side = pixels + 2 * padding
    let bitmap = CGContext(data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: 0,
                           space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    bitmap.setFillColor(CGColor(gray: 1, alpha: 1))
    bitmap.fill(CGRect(x: 0, y: 0, width: side, height: side))
    bitmap.interpolationQuality = .none
    bitmap.draw(imageContext.createCGImage(code, from: code.extent)!,
                in: CGRect(x: padding, y: padding, width: pixels, height: pixels))
    let image = bitmap.makeImage()!
    let file = URL(fileURLWithPath: "site/project-assets/qr/phone-\(screen).png")
    let destination = CGImageDestinationCreateWithURL(file as CFURL, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, image, nil)
    precondition(CGImageDestinationFinalize(destination), "Could not write QR code")
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    try VNImageRequestHandler(url: file).perform([request])
    precondition(request.results?.first?.payloadStringValue == link, "QR scan did not match target URL")
    print("Verified \(screen) QR: \(link)")
}
