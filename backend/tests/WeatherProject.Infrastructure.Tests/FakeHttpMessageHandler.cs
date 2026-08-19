using System.Net;

namespace WeatherProject.Infrastructure.Tests;

// HttpClient'in gercek soket acmasini engelleyip sabit bir cevap dondurur.
// HttpClient'in SocketsHttpHandler'i yerine test'te bu geciriliyor
// (AddHttpClient sonrasi ConfigurePrimaryHttpMessageHandler ile).
public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _statusCode;
    private readonly string _responseBody;

    public FakeHttpMessageHandler(HttpStatusCode statusCode, string responseBody)
    {
        _statusCode = statusCode;
        _responseBody = responseBody;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_responseBody)
        };
        return Task.FromResult(response);
    }
}
