import Foundation

class APIService {
    private let baseURL = "http://localhost:3000"
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    func getAmqpConnection() async throws -> String {
        let url = URL(string: "\(baseURL)/get_amqp_connection")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (data, _) = try await session.data(for: request)
        let response = try JSONDecoder().decode([String: String].self, from: data)
        return response["connection_id"] ?? ""
    }
    
    func prepareInformation() async throws -> [String: Any] {
        let url = URL(string: "\(baseURL)/prepare_information")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (data, _) = try await session.data(for: request)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
    
    func prepareReport(currencyRequestedLimit: String, requestedLimit: String, language: String, currency: String) async throws -> String {
        var components = URLComponents(string: "\(baseURL)/prepare_report")!
        components.queryItems = [
            URLQueryItem(name: "currency_requested_limit", value: currencyRequestedLimit),
            URLQueryItem(name: "requested_limit", value: requestedLimit),
            URLQueryItem(name: "language", value: language),
            URLQueryItem(name: "currency", value: currency)
        ]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        
        let (data, _) = try await session.data(for: request)
        let response = try JSONDecoder().decode([String: String].self, from: data)
        return response["file_uuid"] ?? ""
    }
    
    func getFile(fileUuid: String) async throws -> (status: Int, headers: [String: String], body: Data) {
        var components = URLComponents(string: "\(baseURL)/get_file")!
        components.queryItems = [URLQueryItem(name: "file_uuid", value: fileUuid)]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        
        let (data, response) = try await session.data(for: request)
        let httpResponse = response as! HTTPURLResponse
        
        return (httpResponse.statusCode, httpResponse.allHeaderFields as! [String: String], data)
    }
} 