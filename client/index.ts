import udp from "dgram";
// import { readFileSync, writeFileSync, promises as fsPromises } from "fs";
import { plot, Plot } from "nodeplotlib";
import { interval, Observable, map } from "rxjs";

const plotLength = 2500;
const channelDatas: {
  channelName: string;
  data: number[];
}[] = [];

const stream$: Observable<Plot[]> = interval(66.67).pipe(map(mainPlot));

// function createSinusPlotFromNumber(num: number): Plot[] {
//   const data: Plot[] = [
//     {
//       x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
//       y: Array(10)
//         .fill(0)
//         .map((_, i) => Math.sin(num + i)),
//       type: "scatter",
//     },
//   ];

//   return data;
// }

function mainPlot(num: number): Plot[] {
  let startIndex = channelDatas[0].data.length - plotLength;
  if (startIndex < 0) startIndex = 0;
  let endIndex = channelDatas[0].data.length;

  const data: Plot[] = [
    {
      x: Array(endIndex - startIndex + 1)
        .fill(0)
        .map((_, i) => i),
      y: channelDatas[0].data.slice(startIndex, endIndex),
      type: "scatter",
      name: "Ch1",
      mode: "lines+markers",
    },
  ];

  return data;
}

plot(stream$, {
  height: 800,
  width: 1000,
  // yaxis: { range: [-1000, 1000] },
  title: "EEG Demo",
});

async function main() {
  let SERVER_PORT = 12220;
  let CLIENT_PORT = 12222;
  let SERVER_IP = "192.168.1.10";
  let CLIENT_IP = "192.168.1.15";
  let NORMALIZED = false;
  let client = udp.createSocket("udp4");
  let packet_number = 0;

  const plotLength = client.on("message", function (msg, info) {
    if (info.address != SERVER_IP || info.port != SERVER_PORT) return;
    console.log("recived data");
    //  Normalized:       |sample_count(2B)| ( header_len(1B)| Header(string: char[] ascii)|samples(float32[]) )+
    //  Un Normalized:    |sample_count(2B)| ( header_len(1B)| Header(string: char[] ascii)|samples(int16[]) )+
    const sampleCount = msg.readUInt16LE(0);
    let index = 2;
    // const channelDatas: {
    //   channelName: string;
    //   data: number[];
    // }[] = [];
    while (index < msg.length) {
      const headerLength = msg.readUint8(index);
      index += 1;
      const channelName = msg.subarray(index, index + headerLength).toString();
      index += headerLength;
      const data = NORMALIZED
        ? msg
            .subarray(index, index + 4 * sampleCount)
            .reduce<number[]>(
              (accumulator, currentValue, currentIndex, array) => {
                if (currentIndex % 4 === 0)
                  accumulator.push(
                    Buffer.from(
                      array.slice(currentIndex, currentIndex + 4)
                    ).readFloatLE()
                  );
                return accumulator;
              },
              []
            )
        : msg
            .subarray(index, index + 2 * sampleCount)
            .reduce<number[]>(
              (accumulator, currentValue, currentIndex, array) => {
                if (currentIndex % 2 === 0)
                  accumulator.push(
                    Buffer.from(
                      array.slice(currentIndex, currentIndex + 2)
                    ).readUInt16LE() - 32768
                  );
                return accumulator;
              },
              []
            );
      // const data = NORMALIZED
      //   ? new Float32Array(msg.subarray(index, index + 4 * sampleCount))
      //   : new Uint16Array(msg.subarray(index, index + 2 * sampleCount)).map(
      //       (x) => x - 32768
      //     );
      index += NORMALIZED ? 4 * sampleCount : 2 * sampleCount;
      let foundItem = channelDatas.find(
        (channels) => channels.channelName === channelName
      );
      if (foundItem === undefined) channelDatas.push({ channelName, data });
      else foundItem.data = foundItem.data.concat(data);
      // channelDatas.push({ channelName, data });
    }
    packet_number += 1;
    // console.log(channelDatas);
    console.log(`packet # ${packet_number}`);
  });

  let array = [
    { id: 1, value: "itemname" },
    { id: 2, value: "itemname" },
  ];

  let item1 = array.find((i) => i.id === 2);
  if (item1 === undefined) console.log("there is no such item");
  else item1.id = 3;

  console.log(array);

  client.bind(CLIENT_PORT, CLIENT_IP, () =>
    console.log("listening on " + CLIENT_PORT)
  );
}

main();
