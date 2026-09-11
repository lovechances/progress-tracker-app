import Foundation
import SwiftUI

enum NumberFormats {
    static let moneyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        formatter.usesGroupingSeparator = true
        return formatter
    }()

    static let moneySignedFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        formatter.usesGroupingSeparator = true
        formatter.negativePrefix = "-" + (formatter.positivePrefix)
        return formatter
    }()

    static let decimalOneFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.minimumFractionDigits = 1
        formatter.maximumFractionDigits = 1
        formatter.minimumIntegerDigits = 1
        return formatter
    }()
}

extension Double {
    func formattedMoney() -> String {
        NumberFormats.moneyFormatter.string(from: NSNumber(value: self)) ?? "$\(Int(self))"
    }

    func formattedSignedMoney() -> String {
        if self == 0 { return "$0" }
        return NumberFormats.moneySignedFormatter.string(from: NSNumber(value: self)) ?? "$\(Int(self))"
    }

    func formattedRating() -> String {
        String(format: "%.1f", self)
    }
}

extension MonthlyEntrySnapshot {
    func changeIndicator(_ previous: MonthlyEntrySnapshot?) -> Double? {
        guard let previous else { return nil }
        return money - previous.money
    }
}
