import XCTest
@testable import ProgressPulse

final class ProgressPulseAnalyticsTests: XCTestCase {
    private let months: [MonthlyEntrySnapshot] = [
        .init(
            year: 2024,
            month: 1,
            money: 1000,
            relationships: 3,
            health: 2,
            energy: 1,
            speaking: 2,
            mindAndThought: 1,
            strength: 1,
            appearance: 2,
            changes: "a",
            createdAt: Date(timeIntervalSinceReferenceDate: 0),
            updatedAt: Date(timeIntervalSinceReferenceDate: 0)
        ),
        .init(
            year: 2024,
            month: 2,
            money: 2000,
            relationships: 4,
            health: 3,
            energy: 3,
            speaking: 4,
            mindAndThought: 3,
            strength: 2,
            appearance: 2,
            changes: "b",
            createdAt: Date(timeIntervalSinceReferenceDate: 1),
            updatedAt: Date(timeIntervalSinceReferenceDate: 1)
        ),
        .init(
            year: 2024,
            month: 3,
            money: 3000,
            relationships: 5,
            health: 4,
            energy: 4,
            speaking: 5,
            mindAndThought: 4,
            strength: 3,
            appearance: 3,
            changes: "c",
            createdAt: Date(timeIntervalSinceReferenceDate: 2),
            updatedAt: Date(timeIntervalSinceReferenceDate: 2)
        )
    ]

    func testLifeScoreCalculatesMeanOfAvailableRatings() {
        let first = months[0]
        let result = AnalyticsEngine.lifeScore(for: first)
        XCTAssertEqual(result, 1.8333333333333333, accuracy: 0.0001)
    }

    func testLifeScoreSeriesAndChange() {
        let series = AnalyticsEngine.lifeScoreSeries(from: months)
        XCTAssertEqual(series.count, 3)

        let first = AnalyticsEngine.lifeScore(for: months[0])!
        let second = AnalyticsEngine.lifeScore(for: months[1])!
        let change = AnalyticsEngine.lifeScoreChange(current: months[1], previous: months[0])!
        XCTAssertEqual(change, second - first, accuracy: 0.0001)
    }

    func testRollingAverages() {
        let scores = months.compactMap { AnalyticsEngine.lifeScore(for: $0) }
        let threeMonth = AnalyticsEngine.rollingAverage(scores, window: 3)
        let twoMonth = AnalyticsEngine.rollingAverage(scores, window: 2)
        XCTAssertNotNil(threeMonth)
        XCTAssertNotNil(twoMonth)

        if let avg = threeMonth {
            XCTAssertEqual(avg, (scores.reduce(0, +) / 3), accuracy: 0.0001)
        }
    }

    func testAllTimeHighAndLow() {
        let best = AnalyticsEngine.allTimeHigh(for: RatingCategory.health, entries: months)!
        let worst = AnalyticsEngine.allTimeLow(for: RatingCategory.health, entries: months)!
        XCTAssertEqual(best.0.month, 3)
        XCTAssertEqual(worst.0.month, 1)
    }

    func testAllTimeLifeScoreBest() {
        let best = AnalyticsEngine.allTimeHighLifeScore(entries: months)!
        XCTAssertEqual(best.0.month, 3)
        XCTAssertGreaterThan(best.1, 2.0)
    }

    func testMomentumCalculation() {
        let manyEntries: [MonthlyEntrySnapshot] = (1...6).map { index in
            .init(
                year: 2025,
                month: index,
                money: Double(index * 1000),
                relationships: Double(index) * 0.5,
                health: Double(index) * 0.4,
                energy: 5,
                speaking: 6,
                mindAndThought: 7,
                strength: 5,
                appearance: 6,
                changes: "entry",
                createdAt: Date(timeIntervalSinceReferenceDate: Double(index)),
                updatedAt: Date(timeIntervalSinceReferenceDate: Double(index))
            )
        }

        let (improving, declining) = AnalyticsEngine.momentum(entries: manyEntries)
        XCTAssertTrue(improving.contains { $0.category == .relationships })
        XCTAssertTrue(declining.isEmpty)
    }
}
