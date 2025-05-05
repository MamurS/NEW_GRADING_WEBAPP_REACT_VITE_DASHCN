import SwiftUI

struct CreditRatingsView: View {
    @StateObject private var viewModel = CreditRatingsViewModel()
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Company Information")) {
                    Picker("Country", selection: $viewModel.selectedCountry) {
                        ForEach(Country.allCases, id: \.self) { country in
                            Text(country.rawValue).tag(country)
                        }
                    }
                }
                
                Section(header: Text("Request Details")) {
                    HStack {
                        Picker("Currency", selection: $viewModel.selectedCurrency) {
                            ForEach(Currency.allCases, id: \.self) { currency in
                                Text(currency.rawValue).tag(currency)
                            }
                        }
                        .frame(width: 100)
                        
                        TextField("Amount", text: $viewModel.requestedLimit)
                            .keyboardType(.numberPad)
                    }
                }
                
                Section(header: Text("Preferences")) {
                    Picker("Language", selection: $viewModel.selectedLanguage) {
                        ForEach(Language.allCases, id: \.self) { language in
                            Text(language.rawValue).tag(language)
                        }
                    }
                }
                
                Section {
                    Button(action: {
                        Task {
                            await viewModel.submitForm()
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                        } else {
                            Text("Submit")
                        }
                    }
                    .disabled(viewModel.isLoading)
                }
                
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
                
                if let response = viewModel.getFileResponse {
                    Section(header: Text("Response Details")) {
                        Text("Status: \(response.status)")
                        Text("Headers: \(response.headers.description)")
                        Text("Body: \(String(data: response.body, encoding: .utf8) ?? "")")
                    }
                }
            }
            .navigationTitle("Credit Ratings")
        }
    }
}

enum Country: String, CaseIterable {
    case us = "United States"
    case gb = "United Kingdom"
    case de = "Germany"
}

enum Currency: String, CaseIterable {
    case usd = "USD"
    case eur = "EUR"
    case gbp = "GBP"
}

enum Language: String, CaseIterable {
    case en = "English"
    case de = "German"
    case fr = "French"
}

@MainActor
class CreditRatingsViewModel: ObservableObject {
    private let apiService = APIService()
    
    @Published var selectedCountry: Country = .us
    @Published var selectedCurrency: Currency = .usd
    @Published var requestedLimit: String = ""
    @Published var selectedLanguage: Language = .en
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var getFileResponse: (status: Int, headers: [String: String], body: Data)?
    
    func submitForm() async {
        guard !requestedLimit.isEmpty else {
            errorMessage = "Please enter a limit"
            return
        }
        
        isLoading = true
        errorMessage = nil
        getFileResponse = nil
        
        do {
            // Step 1: Get AMQP connection
            _ = try await apiService.getAmqpConnection()
            
            // Step 2: Prepare information
            _ = try await apiService.prepareInformation()
            
            // Step 3: Prepare report
            let fileUuid = try await apiService.prepareReport(
                currencyRequestedLimit: selectedCurrency.rawValue,
                requestedLimit: requestedLimit,
                language: selectedLanguage.rawValue,
                currency: selectedCurrency.rawValue
            )
            
            // Step 4: Get file
            getFileResponse = try await apiService.getFile(fileUuid: fileUuid)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
} 