import XCTest
@testable import ProgressPulse

final class ProgressPulseParserTests: XCTestCase {
    func testParserNormalizesMoneyAndInconsistentRatings() {
        let text = """
        8/26
        Money: 5.5k
        Relationships: 5/10
        Health: 6.510
        Changes: Routine, budget, 🥑

        9/26
        Money: -1,200
        Health: 7 (sick)
        Speaking: 6.5/10
        Appearance: 8/10
        Changes: budget, ai
        """

        guard let parsed = try? ProgressParser.parseHistoricalData(text) else {
            XCTFail("Failed to parse data")
            return
        }

        XCTAssertEqual(parsed.count, 2)
        XCTAssertEqual(parsed[0].money, 5500)
        XCTAssertEqual(parsed[1].money, -1200)
        XCTAssertEqual(parsed[0].health, 6.5, accuracy: 0.0001)
        XCTAssertEqual(parsed[0].month, 8)
        XCTAssertEqual(parsed[1].month, 9)
        XCTAssertNotNil(parsed[0].changes)
    }

    func testParserKeepsOptionalSexWhenProvided() {
        let text = """
        1/25
        Money: 4500
        Relationships: 5/10
        Health: 6/10
        Energy: 7/10
        Speaking: 6/10
        Mind and Thought: 7/10
        Strength: 6/10
        Sex: 7/10
        Appearance: 7/10
        Changes: keep it clean
        """

        let parsed = try! ProgressParser.parseHistoricalData(text)
        XCTAssertEqual(parsed.count, 1)
        XCTAssertEqual(parsed[0].sex, 7.0)
    }
}
