using System.Net;

namespace WeatherProject.Infrastructure.Tests;

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
