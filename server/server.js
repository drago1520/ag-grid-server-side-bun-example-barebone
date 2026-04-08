import OlympicWinnersService from "./olympicWinnersService.js";

const port = Number(process.env.PORT || 4000);

const routes = {
  "/": () => new Response(Bun.file("client/index.html")),
  "/client/index.js": () =>
    new Response(Bun.file("client/index.js"), {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    }),
};

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/olympicWinners") {
      const body = await request.json();

      return new Promise((resolve) => {
        OlympicWinnersService.getData(body, (rows, lastRow) => {
          resolve(Response.json({ rows, lastRow }));
        });
      });
    }

    const route = routes[url.pathname];
    if (route) {
      return route();
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Started on http://localhost:${port}`);
