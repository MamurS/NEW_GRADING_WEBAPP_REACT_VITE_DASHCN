// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "CreditRatings",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .executable(name: "CreditRatings", targets: ["CreditRatings"])
    ],
    dependencies: [
        // Add your dependencies here
    ],
    targets: [
        .executableTarget(
            name: "CreditRatings",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "CreditRatingsTests",
            dependencies: ["CreditRatings"],
            path: "Tests"
        )
    ]
) 