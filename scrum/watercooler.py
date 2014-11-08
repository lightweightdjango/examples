from urllib.parse import urlparse

from tornado.ioloop import IOLoop
from tornado.web import Application
from tornado.websocket import WebSocketHandler


class SprintHandler(WebSocketHandler):
    """Handles real-time updates to the board."""

    def check_origin(self, origin):
        allowed = super().check_origin(origin)
        parsed = urlparse(origin.lower())
        return allowed or parsed.netloc.startswith('localhost:')

    def open(self, sprint):
        """Subscribe to sprint updates on a new connection."""

    def on_message(self, message):
        """Broadcast updates to other interested clients."""

    def on_close(self):
        """Remove subscription."""


if __name__ == "__main__":
    application = Application([
        (r'/(?P<sprint>[0-9]+)', SprintHandler),
    ])
    application.listen(8080)
    IOLoop.instance().start()
