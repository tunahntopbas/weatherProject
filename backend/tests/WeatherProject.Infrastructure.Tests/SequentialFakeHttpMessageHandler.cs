using System.Net;

namespace WeatherProject.Infrastructure.Tests;

// FakeHttpMessageHandler'dan farki: tek cevap degil, sirali bir kuyruk donduruyor.
// OpenMeteoProvider iki ayri cagri yapiyor (geocode + forecast), bu handler
// o iki cagriya farkli cevaplar vermek gerektiginde kullaniliyor.
public class SequentialFakeHttpMessageHandler : HttpMessageHandler
{
    private readonly Queue<(HttpStatusCode StatusCode, string ResponseBody)> _responses;

    public SequentialFakeHttpMessageHandler(params (HttpStatusCode StatusCode, string ResponseBody)[] responses)
    {
        _responses = new Queue<(HttpStatusCode, string)>(responses);
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var (statusCode, responseBody) = _responses.Dequeue();
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(responseBody)
        };
        return Task.FromResult(response);
    }
}
