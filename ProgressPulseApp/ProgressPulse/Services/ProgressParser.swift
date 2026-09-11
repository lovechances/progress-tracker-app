import Foundation

enum ProgressParseError: Error {
    case missingMonthLine
}

struct ProgressParser {
    private enum Label: String {
        case money = "Money"
        case relationships = "Relationships"
        case health = "Health"
        case energy = "Energy"
        case speaking = "Speaking"
        case mindAndThought = "Mind and Thought"
        case strength = "Strength"
        case sex = "Sex"
        case appearance = "Appearance"
        case changes = "Changes"

        init?(raw: String) {
            switch raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines) {
            case "money": self = .money
            case "relationships": self = .relationships
            case "health": self = .health
            case "energy": self = .energy
            case "speaking": self = .speaking
            case "mind and thought", "mind & thought": self = .mindAndThought
            case "strength": self = .strength
            case "sex": self = .sex
            case "appearance": self = .appearance
            case "changes": self = .changes
            default: return nil
            }
        }
    }

    static func parseHistoricalData(_ text: String) throws -> [MonthlyEntrySnapshot] {
        let normalized = text
            .replacingOccurrences(of: "\r\n", with: "\n")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let blocks = normalized
            .components(separatedBy: "\n\n")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        var entries: [MonthlyEntrySnapshot] = []
        var existingMonthKeys: Set<Int> = []

        for block in blocks {
            guard let firstLine = block.components(separatedBy: "\n").first else { continue }
            guard let (month, year) = parseMonthLine(firstLine) else {
                continue
            }

            var money: Double?
            var relationships: Double?
            var health: Double?
            var energy: Double?
            var speaking: Double?
            var mindAndThought: Double?
            var strength: Double?
            var sex: Double?
            var appearance: Double?
            var changes = ""

            let lines = block.components(separatedBy: "\n").dropFirst()
            for rawLine in lines {
                let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
                guard let colon = line.firstIndex(of: ":") else { continue }
                let keyPart = String(line[..<colon])
                let valuePart = String(line[line.index(after: colon)...]).trimmingCharacters(in: .whitespacesAndNewlines)

                guard let label = Label(raw: keyPart) else { continue }
                switch label {
                case .money:
                    money = parseMoney(valuePart)
                case .relationships:
                    relationships = parseRating(valuePart)
                case .health:
                    health = parseRating(valuePart)
                case .energy:
                    energy = parseRating(valuePart)
                case .speaking:
                    speaking = parseRating(valuePart)
                case .mindAndThought:
                    mindAndThought = parseRating(valuePart)
                case .strength:
                    strength = parseRating(valuePart)
                case .sex:
                    sex = parseRating(valuePart)
                case .appearance:
                    appearance = parseRating(valuePart)
                case .changes:
                    changes = valuePart
                }
            }

            guard let normalizedMoney = money else { continue }

            let entry = MonthlyEntrySnapshot(
                year: year,
                month: month,
                money: normalizedMoney,
                relationships: relationships,
                health: health,
                energy: energy,
                speaking: speaking,
                mindAndThought: mindAndThought,
                strength: strength,
                appearance: appearance,
                sex: sex,
                changes: changes,
                createdAt: Date(timeIntervalSince1970: 0),
                updatedAt: Date(timeIntervalSince1970: 0)
            )

            if existingMonthKeys.contains(entry.monthKey) { continue }
            existingMonthKeys.insert(entry.monthKey)
            entries.append(entry)
        }

        return entries.sorted {
            if $0.year == $1.year { return $0.month < $1.month }
            return $0.year < $1.year
        }
    }

    private static func parseMonthLine(_ line: String) -> (Int, Int)? {
        let clean = line.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = clean.components(separatedBy: "/")
        guard parts.count == 2,
              let month = Int(parts[0].trimmingCharacters(in: .whitespacesAndNewlines)),
              let shortYear = Int(parts[1].trimmingCharacters(in: .whitespacesAndNewlines).prefix(2)),
              (1...12).contains(month)
        else { return nil }

        let year: Int
        if shortYear < 100 {
            year = 2000 + shortYear
        } else {
            year = shortYear
        }

        return (month, year)
    }

    private static func parseMoney(_ rawValue: String) -> Double? {
        let lower = rawValue
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        let noSign = lower.replacingOccurrences(of: "$", with: "")
        if noSign.isEmpty { return nil }

        var isNegative = false
        var valuePart = noSign
        if valuePart.hasPrefix("-") {
            isNegative = true
            valuePart.removeFirst()
        }

        let hasKSuffix = valuePart.hasSuffix("k")
        if hasKSuffix {
            valuePart.removeLast()
        }

        guard let base = Double(valuePart) else { return nil }
        return isNegative ? -base * (hasKSuffix ? 1000 : 1) : base * (hasKSuffix ? 1000 : 1)
    }

    private static func parseRating(_ rawValue: String) -> Double? {
        let cleaned = rawValue.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        if let match = cleaned.range(of: #"-?\d+(\.\d+)?"#, options: .regularExpression) {
            let numberText = String(cleaned[match])
            if let parsed = Double(numberText) {
                return normalizedRating(parsed)
            }
        }
        return nil
    }

    private static func normalizedRating(_ raw: Double) -> Double {
        // Most entries use tenths; this keeps 6.510 as approximately 6.5 and allows precise 0.5 display.
        let snapped = (raw * 2.0).rounded() / 2.0
        return min(10.0, max(0.0, snapped))
    }
}
