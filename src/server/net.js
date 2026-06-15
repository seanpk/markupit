// Listen with port fallback (CLI-5): try the requested port, step to the next free one
// on EADDRINUSE, give up after a small window.
export function listenWithFallback(server, { host, port, maxTries = 20 }) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    let current = port;

    function tryListen() {
      function onError(err) {
        if (err.code === 'EADDRINUSE' && port !== 0 && attempt < maxTries) {
          attempt += 1;
          current += 1;
          server.removeListener('error', onError);
          tryListen();
        } else {
          reject(err);
        }
      }
      server.once('error', onError);
      server.listen(current, host, () => {
        server.removeListener('error', onError);
        resolve(server.address().port);
      });
    }

    tryListen();
  });
}
