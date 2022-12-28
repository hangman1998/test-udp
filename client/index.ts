// import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
// import type { AppRouter } from "../server";
import udp from "dgram";

// const client = createTRPCProxyClient<AppRouter>({
//   links: [
//     httpBatchLink({
//       url: "http://localhost:2022",
//     }),
//   ],
// });

async function main() {
  // const result = await client.greet.query("tRPC");

  // Type safe
  // console.log(result.greeting.toUpperCase());

  let SERVER_PORT = 12220;
  let CLIENT_PORT = 12221;
  let SERVER_IP = "192.168.1.10";
  let CLIENT_IP = "192.168.1.130";
  let NORMALIZED = false;
  let client = udp.createSocket("udp4");

  client.on("message", function (msg, info) {
    if (info.address != SERVER_IP || info.port != SERVER_PORT) return;
    console.log("recived data");
    //  Normalized:       |sample_count(2B)| ( header_len(1B)| Header(string: char[] ascii)|samples(float32[]) )+
    //  Un Normalized:    |sample_count(2B)| ( header_len(1B)| Header(string: char[] ascii)|samples(int16[]) )+
    const sampleCount = msg.readUInt16BE(0);
    let index = 2;
    const channelDatas: {
      channelName: string;
      data: Float32Array | Uint16Array;
    }[] = [];
    while (index < msg.length) {
      const headerLength = msg.readUint8(index);
      index += 1;
      const channelName = msg.subarray(index, index + headerLength).toString();
      index += headerLength;
      const samplesSubBuffer = msg.subarray(index, index + 4 * sampleCount);
      const data = NORMALIZED
        ? new Float32Array(samplesSubBuffer)
        : new Uint16Array(samplesSubBuffer);
      channelDatas.push({ channelName, data });
    }
    console.log(channelDatas);
  });

  client.bind(CLIENT_PORT, CLIENT_IP, () =>
    console.log("listening on " + CLIENT_PORT)
  );
}

main();
