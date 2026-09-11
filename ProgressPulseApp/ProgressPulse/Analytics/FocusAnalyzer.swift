import Foundation

struct FocusTheme: Identifiable {
    let id = UUID()
    let label: String
    let count: Int
    let firstSeen: String
    let months: [String]
}

struct FocusAnalysisService {
    private static let aliases: [String: [String]] = [
        "Finances": ["saving", "savings", "budget", "budgeting", "debt", "money"],
        "Diet": ["diet", "dieting", "clean", "eating"],
        "Routine": ["routine", "consistency", "habit", "habits"],
        "Fitness": ["gym", "exercise", "bulk", "stack", "workout", "fitness"],
        "AI": ["ai", "artificial"],
        "Work": ["work", "job", "office", "career"],
        "Relationships": ["kiara", "relationship", "relationships", "girlfriend", "women", "date", "social"]
    ]

    private static let stopWords: Set<String> = [
        "the", "and", "or", "to", "is", "i", "a", "an", "in", "on", "at", "my", "be", "of", "for", "with", "no", "need", "focus", "also", "go", "get", "finished", "plan"
    ]

    private static let customSplitCharacters = CharacterSet.alphanumerics.inverted

    static func recurringThemes(entries: [MonthlyEntrySnapshot]) -> [FocusTheme] {
        let tokenized = entries.map { entry in
            (entry, tokenize(entry.changes))
        }

        var themeMonths: [String: Set<String>] = [:]

        for (entry, tokens) in tokenized {
            for token in tokens {
                themeMonths[token, default: []].insert(entry.shortMonthLabel)
            }
        }

        var fallbackKeywords: [String: Set<String>] = [:]
        for (theme, aliases) in aliases {
            for month in entries {
                let text = month.changes.lowercased()
                for alias in aliases where text.contains(alias) {
                    fallbackKeywords[theme, default: []].insert(month.shortMonthLabel)
                }
            }
        }

        for (key, vals) in fallbackKeywords {
            if !vals.isEmpty {
                themeMonths[key, default: []].formUnion(vals)
            }
        }

        var output: [FocusTheme] = themeMonths.map { key, months in
            let sorted = months.sorted()
            return FocusTheme(
                label: key,
                count: months.count,
                firstSeen: sorted.first ?? "",
                months: sorted
            )
        }

        output.sort { lhs, rhs in
            if lhs.count == rhs.count { return lhs.label < rhs.label }
            return lhs.count > rhs.count
        }

        return output.filter { $0.count > 1 }
    }

    private static func tokenize(_ raw: String) -> Set<String> {
        let punctuationRemoved = raw
            .lowercased()
            .components(separatedBy: customSplitCharacters)
            .joined(separator: " ")
        let tokens = punctuationRemoved
            .split(separator: " ")
            .map { String($0) }
            .filter { !$0.isEmpty }

        var matches: [String] = []
        for token in tokens {
            if token.count < 2 { continue }
            if stopWords.contains(token) { continue }
            matches.append(token)

            for (theme, aliasList) in aliases {
                if aliasList.contains(where: { $0 == token }) {
                    matches.append(theme)
                    break
                }
            }
        }
        return Set(matches)
    }
}
