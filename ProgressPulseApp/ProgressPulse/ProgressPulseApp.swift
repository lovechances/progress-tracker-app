import SwiftUI
import SwiftData

@main
struct ProgressPulseApp: App {
    private let container: ModelContainer

    init() {
        do {
            let config = ModelConfiguration("ProgressPulseStore")
            container = try ModelContainer(for: MonthlyEntry.self, configurations: config)
        } catch {
            fatalError("Unable to initialize SwiftData container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootTabView(store: ProgressStore(context: container.mainContext))
                .modelContainer(container)
        }
    }
}

struct RootTabView: View {
    @StateObject private var store: ProgressStore

    init(store: ProgressStore) {
        _store = StateObject(wrappedValue: store)
    }

    var body: some View {
        TabView {
            HomeView()
                .environmentObject(store)
                .tabItem {
                    Label("HOME", systemImage: "house.fill")
                }

            NewMonthlyEntryView()
                .environmentObject(store)
                .tabItem {
                    Label("NEW", systemImage: "pencil.and.scribble")
                }

            HistoryView()
                .environmentObject(store)
                .tabItem {
                    Label("HISTORY", systemImage: "clock.arrow.circlepath")
                }

            InsightsView()
                .environmentObject(store)
                .tabItem {
                    Label("INSIGHTS", systemImage: "chart.line.uptrend.xyaxis")
                }
        }
    }
}
