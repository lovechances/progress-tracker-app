import SwiftUI

struct ChangeBadge: View {
    let value: Double?
    let suffix: String

    var body: some View {
        if let value {
            let symbol = value >= 0 ? "↑" : "↓"
            Text("\(symbol) \(abs(value), specifier: "%.1f")\(suffix)")
                .font(.caption.weight(.medium))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background((value >= 0 ? Color.green.opacity(0.2) : Color.red.opacity(0.2)))
                .foregroundStyle(value >= 0 ? .green : .red)
                .clipShape(Capsule())
        } else {
            Text("—")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

struct CategoryRowView: View {
    let title: String
    let value: Double?
    let change: Double?

    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Spacer()
            if let value {
                Text(value.formattedRating())
                    .font(.title3.weight(.bold))
                    .monospacedDigit()
            } else {
                Text("—")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            ChangeBadge(value: change, suffix: "")
        }
    }
}
