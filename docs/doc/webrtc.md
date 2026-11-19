---
title: WebRTC
sidebar_label: WebRTC
hide_title: false
hide_table_of_contents: false
---

# WebRTC

WebRTC is an online real-time communication solution open-sourced by Google. In simple terms, it is an 
internet audio and video conference system. As it follows the RFC standard protocol and is supported 
by browsers, its boundaries are constantly expanding. It is used in low-latency audio and video scenarios,
such as online meetings, live streaming video chat with guests, low-latency live broadcasts, remote 
robot control, remote desktop, cloud video game, smart doorbells, and live web page streaming.

WebRTC is essentially a standard for direct communication between two web browsers, mainly consisting
of signaling and media protocols. Signaling deals with the negotiation of capabilities between two
devices, such as supported encoding and decoding abilities. Media handles the encryption and low-latency
transmission of media packets between devices. In addition, WebRTC itself also implements audio processing
technologies like 3A, network congestion control such as NACK, FEC, and GCC, audio and video encoding
and decoding, as well as smooth and low-latency playback technologies.

```bash
+----------------+                        +----------------+
+    Browser     +----<--Signaling----->--+    Browser     +
+ (like Chrome)  +----<----Media----->----+ (like Chrome)  +
+----------------+                        +----------------+
```

> Note: WebRTC is now an official RFC standard, so it is supported by various browsers. There are many
> open-source implementations, making it available not only in browsers but also in mobile browsers and
> native libraries. For simplicity, in this post, the term "browser" refers to any client or device that
> supports the WebRTC protocol.

In reality, on the internet, it's almost impossible for two browsers to communicate directly, especially 
when they're not on the same local network and are located far apart, like in different cities or countries. 
The data transfer between the two browsers goes through many network routers and firewalls, making it hard 
to ensure good transmission quality. Therefore, in practical applications, data needs to be relayed through 
servers. There are several types of WebRTC servers to help with this process:

* Signaling Server: This is a service that helps two browsers exchange SDP (Session Description Protocol) information. For multi-person conferences, room services are needed, but the main purpose is still to exchange SDP between browsers. In the streaming media field, to enable WebRTC for streaming and playback, similar to RTMP/SRT/HLS streaming, the WHIP/WHEP protocols have been designed.
* TURN Server: Relay service that helps two browsers forward media data between them. This is a transparent forwarding service without data caching, so during multi-person meetings, browsers need to transfer `N*N + N*(N-2)` copies of data. It is generally used in very few communication scenarios, such as one-on-one.
* SFU Server: Selective forwarding service with cached data on the server, allowing browsers to upload only one copy of data, which the server then replicates to other participants. SRS is an example of an SFU. For more information on SFU's role, refer to [this link](https://stackoverflow.com/a/75491178/17679565). Most current WebRTC servers are SFU servers, with `N*N` streams being transferred, reducing the amount of data transfer by `N*(N-2)` compared to TURN servers. This helps solve most transmission issues.
* MCU Server: Multipoint Control Unit Server, the server merges the streams in a conference into one, so the browser only needs to transfer `N*2` sets of data, uploading one and downloading one. However, due to the need for encoding and decoding, the number of streams supported by the server is an order of magnitude less than SFU, and it is only used in certain specific scenarios. For more details, refer to [#3625](https://github.com/ossrs/srs/discussions/3625).

We primarily focus on explaining the SFU (Selective Forwarding Unit) workflow, as it is widely used in
WebRTC servers, and it essentially functions like a browser:

```bash
+----------------+                        +---------+
+    Browser     +----<--Signaling----->--+   SFU   +
+ (like Chrome)  +----<----Media----->----+  Server +
+----------------+                        +---------+
```

> Note: Generally, SFUs have Signaling capabilities. In fact, RTMP addresses can be considered as a very
> simplified signaling protocol. However, WebRTC signaling requires more complex negotiation of media and
> transport capabilities. In complex WebRTC systems, there might be separate Signaling and Room clusters,
> but SFUs also have simplified Signaling capabilities, which may be used for communication with other
> services.

SRS is a media server that provides Signaling and SFU Server capabilities. Unlike other SFUs like Janus, 
SRS is based on streams. Even though there can be multiple participants in a room, essentially, someone is 
pushing a stream, and others are subscribing to it. This way, it avoids coupling all the streams in a room to 
a single SFU transmission and can distribute them across multiple SFU transmissions, allowing for larger 
conferences with more participants.

SRS supports signaling protocols WHIP and WHEP. For more details, please refer to the [HTTP API](#http-api) 
section. Unlike live streaming, signaling and media are separated, so you need to set up Candidates, see 
[Candidate](#config-candidate). Media uses UDP by default, but if UDP is unavailable, you can use TCP as described in 
[TCP](#webrtc-over-tcp). If you encounter issues, it could be due to incorrect Candidate settings or firewall/port 
restrictions, refer to [Connectivity](#connection-failures) and use the provided tools to check. SRS also supports 
converting between different protocols, such as streaming RTMP and viewing with WebRTC, as explained in 
[RTMP to WebRTC](#rtmp-to-rtc), or streaming with WebRTC and viewing with HLS, as described in 
[RTC to RTMP](#rtc-to-rtmp).

SRS supported the WebRTC protocol in 2020. For more information on the development process, please refer
to [#307](https://github.com/ossrs/srs/issues/307).

## Config

There are some config for WebRTC, please see `full.conf` for more:

```bash
rtc_server {
    # Whether enable WebRTC server.
    # Overwrite by env SRS_RTC_SERVER_ENABLED
    # default: off
    enabled on;
    # The udp listen port, we will reuse it for connections.
    # Overwrite by env SRS_RTC_SERVER_LISTEN
    # default: 8000
    listen 8000;
    # For WebRTC over TCP directly, not TURN, see https://github.com/ossrs/srs/issues/2852
    # Some network does not support UDP, or not very well, so we use TCP like HTTP/80 port for firewall traversing.
    tcp {
        # Whether enable WebRTC over TCP.
        # Overwrite by env SRS_RTC_SERVER_TCP_ENABLED
        # Default: off
        enabled off;
        # The TCP listen port for WebRTC. Highly recommend is some normally used ports, such as TCP/80, TCP/443,
        # TCP/8000, TCP/8080 etc. However SRS default to TCP/8000 corresponding to UDP/8000.
        # Overwrite by env SRS_RTC_SERVER_TCP_LISTEN
        # Default: 8000
        listen 8000;
    }
    # The protocol for candidate to use, it can be:
    #       udp         Generate UDP candidates. Note that UDP server is always enabled for WebRTC.
    #       tcp         Generate TCP candidates. Fail if rtc_server.tcp(WebRTC over TCP) is disabled.
    #       all         Generate UDP+TCP candidates. Ignore if rtc_server.tcp(WebRTC over TCP) is disabled.
    # Note that if both are connected, we will use the first connected(DTLS done) one.
    # Overwrite by env SRS_RTC_SERVER_PROTOCOL
    # Default: udp
    protocol udp;
    # The exposed candidate IPs, response in SDP candidate line. It can be:
    #       *           Retrieve server IP automatically, from all network interfaces.
    #       $CANDIDATE  Read the IP from ENV variable, use * if not set.
    #       x.x.x.x     A specified IP address or DNS name, use * if 0.0.0.0.
    # @remark For Firefox, the candidate MUST be IP, MUST NOT be DNS name, see https://bugzilla.mozilla.org/show_bug.cgi?id=1239006
    # @see https://ossrs.net/lts/zh-cn/docs/v4/doc/webrtc#config-candidate
    # Overwrite by env SRS_RTC_SERVER_CANDIDATE
    # default: *
    candidate *;
}

vhost rtc.vhost.srs.com {
    rtc {
        # Whether enable WebRTC server.
        # Overwrite by env SRS_VHOST_RTC_ENABLED for all vhosts.
        # default: off
        enabled on;
        # Whether support NACK.
        # default: on
        nack on;
        # Whether to prefer RFC 4588 RTX when answering a NACK. This is a preference, not a
        # requirement: SRS never forces RTX on a peer that did not offer it. Requires nack on.
        # default: off
        nack_prefer_rtx off;
        # Whether support TWCC.
        # default: on
        twcc on;
        # Whether enable transmuxing RTMP to RTC.
        # If enabled, transcode aac to opus.
        # Overwrite by env SRS_VHOST_RTC_RTMP_TO_RTC for all vhosts.
        # default: off
        rtmp_to_rtc off;
        # Whether enable transmuxing RTC to RTMP.
        # Overwrite by env SRS_VHOST_RTC_RTC_TO_RTMP for all vhosts.
        # Default: off
        rtc_to_rtmp off;
    }
}
```

The config `rtc_server` is global configuration for RTC, for example:
* `enabled`：Whether enable WebRTC server.
* `listen`：The udp listen port, we will reuse it for connections.
* `candidate`：The exposed candidate IPs, response in SDP candidate line. Please read [Config: Candidate](./webrtc.md#config-candidate) for detail.
* `tcp.listen`: Whether enable WebRTC over TCP. Please read [WebRTC over TCP](./webrtc.md#webrtc-over-tcp) for detail.

For each vhost, the configuration is `rtc` section, for example:
* `rtc.enabled`：Whether enable WebRTC server for this vhost.
* `rtc.rtmp_to_rtc`：Whether enable transmuxing RTMP to RTC.
* `rtc.rtc_to_rtmp`：Whether enable transmuxing RTC to RTMP.
* `rtc.stun_timeout`：The timeout in seconds for session timeout.
* `rtc.nack`：Whether support NACK for ARQ.
* `rtc.nack_prefer_rtx`：Whether to prefer RFC 4588 RTX over plain retransmission for a peer that offers it. Please read [Config: NACK and RTX](./webrtc.md#config-nack-and-rtx) for detail.
* `rtc.twcc`：Whether support TWCC for congestion feedback.
* `rtc.dtls_role`：The role of dtls when peer is actpass: passive or active.
* `rtc.dtls_version`：The DTLS version: `auto`, `dtls1.0`, `dtls1.2`, or `dtls1.3` on an OpenSSL 4.1 build. Please read [SPED and DTLS 1.3](./webrtc.md#sped-and-dtls-13) for detail.
* `rtc.sped`：Whether to run the DTLS handshake inside the ICE checks (SPED) when the client offers it, default off. Please read [SPED and DTLS 1.3](./webrtc.md#sped-and-dtls-13) for detail.

## Config: Candidate

Please note that `candidate` is essential important, and most failure is caused by wrong `candidate`, so be careful.

The easiest method to modify the `candidate` involves indicating the `eip` in the URL. For instance, if your server 
is `192.168.3.10`, utilize this URL:

* [http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&eip=192.168.3.10](http://localhost:8080/players/whip.html?eip=192.168.3.10)

Moreover, the easiest and most direct method to modify the default UDP port `8000`, particularly when it is 
behind a load balancer or proxy, involves utilizing the `eip`. For example, if you employ UDP `18000` as the port, 
consider using this URL:

* [http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&eip=192.168.3.10:18000](http://localhost:8080/players/whip.html?eip=192.168.3.10:18000)

As it shows, `candidate` is server IP to connect to, SRS will response it in SDP answer as `candidate`, like this one:

```bash
type: answer, sdp: v=0
a=candidate:0 1 udp 2130706431 192.168.3.6 8000 typ host generation 0
```

So the `192.168.3.6 8000` is an endpoint that client could access. There be some IP you can use:
* Config as fixed IP, such as `candidate 192.168.3.6;`
* Use `ifconfig` to get server IP and pass by environment variable, such as `candidate $CANDIDATE;`
* Detect automatically, first by environment, then use server network interface IP, such as `candidate *;`, we will explain at bellow.
* Specify the `?eip=x` in URL, such as: `webrtc://192.168.3.6/live/livestream?eip=192.168.3.6`
* Normally API is provided by SRS, so you're able to use hostname of HTTP-API as `candidate`, we will explain at bellow.

Configurations for automatically detect the IP for `candidate`:
* `candidate *;` or `candidate 0.0.0.0;` means detect the network interface IP.
* `use_auto_detect_network_ip on;` If disabled, never detect the IP automatically.
* `ip_family ipv4;` To filter the IP if automatically detect.

Configurations for using HTTP-API hostname as `candidate`:
* `api_as_candidates on;` If disabled, never use HTTP API hostname as candidate.
* `resolve_api_domain on;` If hostname is domain name, resolve to IP address. Note that Firefox does not support domain name.
* `keep_api_domain on;` Whether keep the domain name to resolve it by client.

> Note: Please note that if no `candidate` specified, SRS will use one automatically detected IP.

In short, the `candidate` must be a IP address that client could connect to.

Use command `ifconfig` to retrieve the IP:

```bash
# For macOS
CANDIDATE=$(ifconfig en0 inet| grep 'inet '|awk '{print $2}')

# For CentOS
CANDIDATE=$(ifconfig eth0|grep 'inet '|awk '{print $2}')

# Directly set ip.
CANDIDATE="192.168.3.10"
```

Pass it to SRS by ENV:

```bash
env SRS_RTC_SERVER_CANDIDATE="192.168.3.10" \
  SRS_RTMP_LISTEN=1935 SRS_HTTP_API_ENABLED=on SRS_HTTP_SERVER_ENABLED=on \
  SRS_RTC_SERVER_ENABLED=on SRS_VHOST_RTC_ENABLED=on SRS_VHOST_HTTP_REMUX_ENABLED=on \
  ./objs/srs -e
```

Or use the config file with `candidate $CANDIDATE;`: `env CANDIDATE="192.168.3.10" ./objs/srs -c conf/rtc.conf`

For example, to run SRS in docker, and setup the CANDIDATE:

```bash
export CANDIDATE="192.168.3.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_HTTP_REMUX_ENABLED=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

> Note：About the usage of srs-docker, please read [srs-docker](https://github.com/ossrs/dev-docker/tree/v4#usage).

## Config: NACK and RTX

When a packet is lost, the receiver asks for it with an RTCP NACK, and the sender resends it. There are two ways to
resend:

* **Plain retransmission** sends the original packet again, on the same SSRC with the same sequence number, which the
  receiver cannot tell apart from the original.
* **RFC 4588 RTX** wraps the lost packet in a new packet on a separate RTX SSRC, with its own sequence number and
  payload type and the original sequence number, so the receiver can tell a retransmission from the original.

SRS supports both, in both directions of a session, and a per-vhost preference chooses which one it selects for a peer
that can do both:

```
vhost rtc.vhost.srs.com {
    rtc {
        nack on;
        # Whether to prefer RFC 4588 RTX when answering a NACK. This is a preference, not a
        # requirement: SRS never forces RTX on a peer that did not offer it.
        # default: off
        nack_prefer_rtx off;
    }
}
```

With `nack_prefer_rtx on`, SRS uses RTX for a peer that offers `rtx` and plain retransmission for one that does not.
With `nack_prefer_rtx off`, every peer gets plain retransmission, so you can test the fallback with the same client.
Only video uses RTX; browsers never offer `rtx` for audio.

When RTX is negotiated, the SDP answer carries the `rtx` payload and its FID group, and SRS resends lost packets on the
RTX SSRC.

## SPED and DTLS 1.3

Before media flows, a WebRTC session runs its protocols one after another: the WHIP or WHEP offer and answer (1 RTT),
the ICE check (1 RTT), and the DTLS handshake (2 RTTs on DTLS 1.2). SRS 8.0 has two experimental ways to make this
faster, both off by default:

* **SPED** (STUN Protocol for Embedding DTLS, [draft-hancke-webrtc-sped-01](https://www.ietf.org/archive/id/draft-hancke-webrtc-sped-01.html))
  puts the DTLS handshake inside the ICE STUN Binding requests and responses. The client's ClientHello rides in its
  first check, and SRS's first DTLS flight rides in the response, which saves one RTT. When a handshake packet is lost,
  the next check, about 50 ms later, carries it again, instead of waiting for the DTLS retransmission timer, which
  doubles after each loss.
* **DTLS 1.3** needs one RTT for the handshake instead of two. It needs SRS built with OpenSSL 4.1, and SPED works on it
  too.

So the setup is 4 RTTs with DTLS 1.2, 3 with SPED or DTLS 1.3, and 2 with both. SPED helps most on long or lossy paths,
such as mobile networks; on a LAN the RTT it saves is too small to notice.

### Enable SPED

```
vhost __defaultVhost__ {
    rtc {
        enabled on;
        # Whether to answer a=ice-options:sped when the offer has it, so the DTLS handshake rides inside the
        # ICE STUN Binding requests and responses (SPED). It saves one RTT.
        # Overwrite by env SRS_VHOST_RTC_SPED for all vhosts.
        # default: off
        sped on;
    }
}
```

Or with Docker:

```bash
export CANDIDATE="192.168.3.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_RTC_SPED=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

* SRS uses SPED only for a client whose offer has `sped` in `a=ice-options`, and then answers `a=ice-options:sped`.
  Every other client connects as before, so it is safe to turn on for a vhost with mixed clients.
* If the client's first check carries no SPED attribute, SRS turns SPED off for the session and the DTLS handshake runs
  as before.
* It works for WebRTC over UDP and over [TCP](./webrtc.md#webrtc-over-tcp), for WHIP and WHEP.
* A value other than `on` or `off` is refused at startup.

### Enable DTLS 1.3

DTLS 1.3 needs OpenSSL 4.1 or newer. The default build, and the `ossrs/srs:8` image, use OpenSSL 1.1.1 and DTLS 1.2, so
build SRS from source with the bundled OpenSSL 4.1:

```bash
cd srs/trunk
./configure --ssl-4=on && make
```

Then set the version with `dtls_version`, or the env `SRS_VHOST_RTC_DTLS_VERSION`:

```
vhost __defaultVhost__ {
    rtc {
        # auto: the newest version both sides have, up to DTLS 1.3 on an OpenSSL 4.1 build.
        # dtls1.3: DTLS 1.3 only; refused at startup by a build without OpenSSL 4.1.
        # default: auto
        dtls_version dtls1.3;
    }
}
```

| `dtls_version` | OpenSSL 4.1 build | Other builds |
|---|---|---|
| `auto` (default) | up to DTLS 1.3, falls back to 1.2 | DTLS 1.2 |
| `dtls1.3` | DTLS 1.3 only | refused at startup |
| `dtls1.2` | DTLS 1.2 only | DTLS 1.2 only |

* With `auto`, an OpenSSL 4.1 build gets DTLS 1.3 from Chrome, which supports it by default, and DTLS 1.2 from a client
  that has only 1.2.
* `--sys-ssl=on` against a system OpenSSL 4.1 or newer also gets DTLS 1.3, but OpenSSL 4.1.0's DTLS 1.3 server aborts
  the handshake when a browser ACKs part of its flight after a packet loss ([openssl#33242](https://github.com/openssl/openssl/issues/33242)).
  The bundled OpenSSL 4.1 carries the upstream fix, so prefer `--ssl-4=on`.
* The native Windows build uses vcpkg's OpenSSL and stays on DTLS 1.2.
* `/api/v1/features` has `dtls13`, which is true on a build with DTLS 1.3.

### Try it with Chrome

Chrome has SPED only behind a field trial. Start it with:

```bash
# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --force-fieldtrials=WebRTC-IceHandshakeDtls/Enabled/

# Linux
google-chrome --force-fieldtrials=WebRTC-IceHandshakeDtls/Enabled/
```

Then publish with [WHIP](http://localhost:8080/players/whip.html) or play with [WHEP](http://localhost:8080/players/whep.html)
against SRS with `sped on`. With the trial, Chrome's offer has `a=ice-options:trickle sped googspedv1`; without it, only
`trickle`.

To check that SPED was used, query the clients API:

```bash
curl http://localhost:1985/api/v1/clients/
```

An RTC client whose session negotiated SPED has a `"sped"` object, for example:

```json
"sped": {"state": "complete", "embedded_sent": 0, "embedded_recv": 1, "raw_recv": 2, "handshake_ms": 2}
```

* `state` is `complete` when the handshake finished with SPED, or `off` when the client fell back.
* `embedded_sent` and `embedded_recv` count the DTLS packets SRS sent and received inside STUN, and `raw_recv` the ones
  it received as plain DTLS. On a lossless path Chrome embeds the first part of its ClientHello and sends the rest
  plain, so `embedded_recv` is often 1.
* `handshake_ms` is the time from the first STUN check to DTLS done.

SRS also logs one line per session, such as `RTC: SPED complete, embedded sent=0, embedded recv=1, raw recv=2, handshake=2ms`.
A client without SPED has no `sped` object. In `chrome://webrtc-internals`, the transport's `tlsVersion` is `FEFC` for
DTLS 1.3 and `FEFD` for DTLS 1.2.

### Results

Measured on an Apple M4 Mac with two clients:

* **A Go WebRTC player, for SPED over DTLS 1.2 under delay and loss.** pion/dtls has only DTLS 1.2 and no SPED, so the
  player implements SPED itself on top of pion's DTLS 1.2, by carrying the DTLS records inside its STUN checks. It can't
  measure SPED over DTLS 1.3.
* **Chrome 158 with the SPED field trial, for DTLS 1.2 and 1.3.** It runs on a LAN only, with no added delay; one test
  drops SRS's first STUN response.

The Go player's results, 30 runs per point, from posting the offer to DTLS done. The delay is one way and applies to
signaling too; the loss is of STUN and DTLS packets, each way:

| One-way delay | Loss | p50 without SPED | p50 with SPED | p95 without SPED | p95 with SPED |
|---|---|---|---|---|---|
| 20 ms | 0% | 183 ms | 138 ms | 187 ms | 144 ms |
| 60 ms | 0% | 502 ms | 384 ms | 510 ms | 392 ms |
| 150 ms | 0% | 1230 ms | 918 ms | 1237 ms | 930 ms |
| 60 ms | 25% | 1654 ms | 404 ms | 18841 ms | 527 ms |
| 150 ms | 25% | 2215 ms | 966 ms | 9273 ms | 1085 ms |

* Without loss, SPED saves one RTT: 45, 118 and 312 ms at 20, 60 and 150 ms one way.
* At 25% loss, SPED keeps the p95 near one second, while without it 7–13% of the handshakes did not finish within 30 s.
  No SPED handshake failed.
* Chrome on a LAN connects in about 2 ms with and without SPED, on DTLS 1.2 and 1.3. The first video frame, about
  175 ms, is the wait for the publisher's next keyframe, which SPED does not change.
* With SPED, when SRS's first STUN response to Chrome is lost, the handshake still completes, about 50 ms later on
  DTLS 1.2 and about 100 ms later on DTLS 1.3.

The design, the packet formats and every test are in the SRS repository, [trunk/doc/WebRTC-SPED.md](https://github.com/ossrs/srs/blob/develop/trunk/doc/WebRTC-SPED.md).

### Caveats

* SPED is an individual IETF draft, not adopted by a working group, and its STUN attribute codepoints are not
  assigned yet. SRS uses the ones Chrome uses, `0xC070` and `0xC071`, so a later assignment may need an SRS upgrade.
* Chrome supports SPED only behind its field trial, and only Chrome; other browsers and clients connect without it.
* OpenSSL 4.1 is not an LTS release. The OpenSSL 4.1 build and DTLS 1.3 are not the default.
* SPED speeds up the connection, not the first frame: SRS sends media only after the DTLS handshake, and a player still
  waits for a keyframe.
* With SPED on DTLS 1.2, SRS starts sending media to a player only once the player has shown it finished DTLS, by an
  ACK in STUN, a check without SPED attributes, or its first SRTP or SRTCP packet. This is about 50–65 ms after SRS's
  own handshake on a LAN with Chrome, and it keeps a player whose last DTLS packet from SRS was lost from dropping the
  media sent meanwhile.

## Stream URL

In SRS, both live streaming and WebRTC are based on the concept of `streams`. So, the URL definition for 
streams is very consistent. Here are some different stream addresses for various protocols in SRS, which 
you can access after installing SRS:

* Publish or play stream over RTMP: `rtmp://localhost/live/livestream`
* Play stream over HTTP-FLV: [http://localhost:8080/live/livestream.flv](http://localhost:8080/players/srs_player.html)
* Play stream over HLS: [http://localhost:8080/live/livestream.m3u8](http://localhost:8080/players/srs_player.html?stream=livestream.m3u8)
* Publish stream over WHIP: [http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream](http://localhost:8080/players/whip.html)
* Play stream over WHEP: [http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream](http://localhost:8080/players/whep.html)

> Remark: Since Flash is disabled, RTMP streams cannot be played in Chrome. Please use VLC to play them.

Before WHIP and WHEP were introduced, SRS supported another format with a different HTTP API format, but it 
still exchanged SDP. It is no longer recommended:

* Publish: [webrtc://localhost/live/livestream](http://localhost:8080/players/rtc_publisher.html)
* Play: [webrtc://localhost/live/livestream](http://localhost:8080/players/rtc_player.html)

> Note: SRT addresses are not provided here because their design is not in a common URL format.

## WebRTC over TCP

In many networks, UDP is not available for WebRTC, so TCP is very important to make it highly reliable. SRS supports directly TCP transport for WebRTC, not TURN, which introduce a complex network layer and system. It also makes the LoadBalancer possible to forward TCP packets, because TCP is more stable than UDP for LoadBalancer.

* All HTTP API, HTTP Stream and WebRTC over TCP reuses one TCP port, such as TCP(443) for HTTPS.
* Support directly transport over UDP or TCP, no dependency of TURN, no extra system and resource cost.
* Works very well with [Proxy(Not Implemented)](https://github.com/ossrs/srs/issues/3138) and [Cluster(Not Implemented)](https://github.com/ossrs/srs/issues/2091), for load balancing and system capacity.

Run SRS with WebRTC over TCP, by default the port is 8000:

```bash
docker run --rm -it -p 8080:8080 -p 1985:1985 -p 8000:8000 \
  -e CANDIDATE="192.168.3.82" \
  -e SRS_RTC_SERVER_TCP_ENABLED=on \
  -e SRS_RTC_SERVER_PROTOCOL=tcp \
  -e SRS_RTC_SERVER_TCP_LISTEN=8000 \
  ossrs/srs:v5
```

Please use [FFmpeg](https://ffmpeg.org/download.html) or [OBS](https://obsproject.com/download) to publish stream:

```bash
ffmpeg -re -i ./doc/source.flv -c copy -f flv rtmp://localhost/live/livestream
```

* Play WebRTC over TCP: [http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream](http://localhost:8080/players/whep.html?autostart=true)
* Play HTTP FLV: [http://localhost:8080/live/livestream.flv](http://localhost:8080/players/srs_player.html?autostart=true)
* Play HLS: [http://localhost:8080/live/livestream.m3u8](http://localhost:8080/players/srs_player.html?stream=livestream.m3u8&autostart=true)

> Note: We config SRS by environment variables, you're able to use config file also.

> Note: We use dedicated TCP port, for example, HTTP API(1985), HTTP Stream(8080) and WebRTC over TCP(8000), you're able to reuse one TCP port at HTTP Stream(8080).

## HTTP API

SRS supports WHIP and WHEP protocols. After installing SRS, you can test it with the following links:

* To use WHIP for streaming: [http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream](http://localhost:8080/players/whip.html)
* To use WHEP for playback: [http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream](http://localhost:8080/players/whep.html)

For details on the protocols, refer to [WHIP](./http-api.md#webrtc-publish) and [WHEP](./http-api.md#webrtc-play).
Bellow is the workflow:

[![](/img/doc-whip-whep-workflow.png)](https://www.figma.com/file/fA75Nl6Fr6v8hsrJba5Xrn/How-Does-WHIP%2FWHEP-Work%3F?type=whiteboard&node-id=0-1)

### Authentication

SRS optionally supports Bearer authentication for WHIP and WHEP signaling. It
is disabled for RTC by default. Enable `http_api.auth`, set its type to
`bearer`, configure a token, and explicitly enable RTC Bearer authentication:

```bash
env SRS_RTMP_LISTEN=1935 SRS_HTTP_API_ENABLED=on SRS_HTTP_SERVER_ENABLED=on \
    SRS_RTC_SERVER_ENABLED=on SRS_VHOST_RTC_ENABLED=on SRS_VHOST_HTTP_REMUX_ENABLED=on \
    SRS_HTTP_API_AUTH_ENABLED=on \
    SRS_HTTP_API_AUTH_TYPE=bearer \
    SRS_HTTP_API_AUTH_TOKEN=srs-api-token \
    SRS_HTTP_API_AUTH_RTC_BEARER_ENABLED=on \
    ./objs/srs -e
```

The WHIP or WHEP client must send the token in the HTTP request:

```text
Authorization: Bearer srs-api-token
```

Basic authentication does not apply to WHIP or WHEP. When RTC Bearer
authentication is disabled, SRS can use HTTP callbacks alone for WebRTC
authorization: `on_publish` handles WHIP publishing and `on_play` handles WHEP
playback. Bearer authentication and HTTP callbacks can also be enabled together;
the request must first pass Bearer authentication and then be accepted by the
callback. See [HTTP API Authentication](./http-api.md#authentication) and
[HTTP Callback](./http-callback.md).

If you install SRS on a Mac or Linux, you can test the local SRS service with localhost. However, if you're using 
Windows, a remote Linux server, or need to test on other devices, you must use HTTPS for WHIP streaming, while 
WHEP can still use HTTP. To enable SRS HTTPS, refer to [HTTPS API](./http-api.md#https-api), or use a web server 
proxy like Nginx by referring to [HTTPS Proxy](./http-api.md#http-and-https-proxy).

If you need to test if the HTTP API is working properly, you can use the `curl` tool. For more details, please
refer to [Connectivity Check](#connection-failures).

## Connection Failures

Some developer come to SRS community to get help, because they get error when use OBS WHIP to connect to online WHIP
server, because online server must use HTTPS and the UDP port might be more available, and it's hard to debug or
login to the online server for privacy or network issue.

So we find some ways to troubleshoot the connection failures in OBS WHIP, generally it's caused by HTTPS API setup
or UDP port not available issue.

Use curl to test WHIP HTTP or HTTPS API:

```bash
curl "http://localhost:1985/rtc/v1/whip/?ice-ufrag=6pk11386&ice-pwd=l91z529147ri9163933p51c4&app=live&stream=livestream-$(date +%s)" \
  -H 'Origin: http://localhost' -H 'Referer: http://localhost' \
  -H 'Accept: */*' -H 'Content-type: application/sdp' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' \
  --data-raw $'v=0\r\na=group:BUNDLE 0 1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:J8X7\r\na=ice-pwd:Dpq7/fW/osYcPeLsCW2Ek1JH\r\na=setup:actpass\r\na=mid:0\r\na=sendonly\r\na=msid:- audio\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=ssrc:3184534672 cname:stream\r\nm=video 9 UDP/TLS/RTP/SAVPF 106\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:J8X7\r\na=ice-pwd:Dpq7/fW/osYcPeLsCW2Ek1JH\r\na=setup:actpass\r\na=mid:1\r\na=sendonly\r\na=msid:- video\r\na=rtcp-mux\r\na=rtpmap:106 H264/90000\r\na=ssrc:512761356 cname:stream' \
  -v -k
```

> Note: You can replace `http://localhost` with `https://yourdomain.com` to test HTTPS API.

> Note: For Oryx, you should specify the secret, so please change the `/rtc/v1/whip?ice-ufrag=` to `/rtc/v1/whip?secret=xxx&ice-ufrag=` as such.

> Note: You can also use `eip=ip` or `eip=ip:port` to force SRS to use it as the candidate. Please see [CANDIDATE](#config-candidate) for details.

The answer contains the candidate, the UDP server IP, such as `127.0.0.1`:

```
a=candidate:0 1 udp 2130706431 127.0.0.1 8000 typ host generation 0
```

Use `nc` to send UDP packet to SRS WHIP server:

```bash
echo -en "\x00\x01\x00\x50\x21\x12\xa4\x42\x74\x79\x6d\x7a\x41\x51\x2b\x2f\x4a\x4b\x77\x52\x00\x06\x00\x0d\x36\x70\x6b\x31\x31\x33\x38\x36\x3a\x4a\x38\x58\x37\x00\x00\x00\xc0\x57\x00\x04\x00\x01\x00\x0a\x80\x2a\x00\x08\xda\xad\x1d\xce\xe8\x95\x5a\x83\x00\x24\x00\x04\x6e\x7f\x1e\xff\x00\x08\x00\x14\x56\x8f\x1e\x1e\x4f\x5f\x17\xf9\x2e\xa1\xec\xbd\x51\xd9\xa2\x27\xe4\xfd\xda\xb1\x80\x28\x00\x04\x84\xd3\x5a\x79" \
  |nc -w 3 -u 127.0.0.1 8000 |od -Ax -c -t x1 |grep '000' && \
  echo "Success" || echo "Failed"
```

> Note: You also can use `nc` or [server.go](https://github.com/ossrs/srs/pull/3837) as the UDP server for test.

If use SRS as WHIP server, should response with:

```
0000000  001 001  \0   @   ! 022 244   B   t   y   m   z   A   Q   +   /
0000010    J   K   w   R  \0 006  \0  \r   6   p   k   1   1   3   8   6
0000020    :   J   8   X   7  \0  \0  \0  \0      \0  \b  \0 001 376   `
0000030    ầ  **  ** 027  \0  \b  \0 024 206 263   +   ŉ  ** 025   G 215
0000040    I 335   P   ^   "   7   }   N   ? 017 037 224 200   (  \0 004
0000050  303   < 250 272                                                
0000054
Success
```

> Note: Should be SRS 5.0.191+, see [#3837](https://github.com/ossrs/srs/pull/3837), you can also use
> [server.go](https://github.com/ossrs/srs/issues/2843) as the UDP server for test.

## RTMP to RTC

Please enable RTMP to WebRTC, or use `conf/rtmp2rtc.conf` as config.

```bash
export CANDIDATE="192.168.1.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_HTTP_REMUX_ENABLED=on \
  --env SRS_VHOST_RTC_RTMP_TO_RTC=on --env SRS_VHOST_RTC_RTC_TO_RTMP=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

> Note: Please set CANDIDATE as the ip of server, please read [CANDIDATE](./webrtc.md#config-candidate).

Use FFmpeg docker to push to localhost:

```bash
docker run --rm -it ossrs/srs:encoder ffmpeg -stream_loop -1 -re -i doc/source.flv \
  -c copy -f flv rtmp://host.docker.internal/live/livestream
```

Play the stream in browser:

* WebRTC：[http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream](http://localhost:8080/players/whep.html?autostart=true)
* HTTP-FLV：[http://localhost:8080/live/livestream.flv](http://localhost:8080/players/srs_player.html?autostart=true&stream=livestream.flv&port=8080&schema=http)

## RTC to RTC

Please enable WebRTC, or use `conf/rtc.conf` as config.

```bash
export CANDIDATE="192.168.1.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_HTTP_REMUX_ENABLED=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

> Note: Please set CANDIDATE as the ip of server, please read [CANDIDATE](./webrtc.md#config-candidate).

Play the stream in browser:

* Publish stream over WHIP: [http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream](http://localhost:8080/players/whip.html)
* Play stream over WHEP: [http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream](http://localhost:8080/players/whep.html)

> Remark: Note that if not localhost, the WebRTC publisher should be HTTPS page.

## RTC to RTMP

Please enable WebRTC to RTMP, or use `conf/rtc2rtmp.conf` as config.

```bash
export CANDIDATE="192.168.1.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_HTTP_REMUX_ENABLED=on \
  --env SRS_VHOST_RTC_RTMP_TO_RTC=on --env SRS_VHOST_RTC_RTC_TO_RTMP=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

> Note: Please set CANDIDATE as the ip of server, please read [CANDIDATE](./webrtc.md#config-candidate).

The streams:

* Publish stream over WHIP: [http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream](http://localhost:8080/players/whip.html)
* Play stream over WHEP: [http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream](http://localhost:8080/players/whep.html)
* HTTP-FLV：[http://localhost:8080/live/show.flv](http://localhost:8080/players/srs_player.html?autostart=true&stream=show.flv)
* RTMP by VLC：rtmp://localhost/live/show

## AV1 Codec Support

SRS supports AV1 codec for WebRTC-to-WebRTC streaming since v4.0.91 ([#2324](https://github.com/ossrs/srs/pull/2324)).
AV1 is a royalty-free codec that saves 30-50% bandwidth compared to H.264. SRS implements AV1 as relay-only (SFU mode),
accepting AV1 streams via WHIP and forwarding to WHEP players without transcoding. AV1 streams cannot be converted to
RTMP/HLS or recorded to DVR.

To use AV1, add the `codec=av1` query parameter to WHIP/WHEP URLs:

* Publish: `http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&codec=av1`
* Play: `http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream&codec=av1`

Browser support: Chrome/Edge M90+, Firefox (full support), Safari (decode only). Use H.264 if you need RTMP/HLS conversion,
DVR recording, or maximum compatibility.

## VP9 Codec Support

SRS supports VP9 codec for WebRTC-to-WebRTC streaming since v7.0.123 ([#4548](https://github.com/ossrs/srs/issues/4548)).
VP9 is a royalty-free codec that saves 20-40% bandwidth compared to H.264. VP9 works better than H.264/H.265 with congestion control
in WebRTC, making it ideal for keeping streams live under network fluctuations. SRS implements VP9 as relay-only (SFU mode),
accepting VP9 streams via WHIP and forwarding to WHEP players without transcoding. VP9 streams cannot be converted to
RTMP/HLS or recorded to DVR.

To use VP9, add the `codec=vp9` query parameter to WHIP/WHEP URLs:

* Publish: `http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&codec=vp9`
* Play: `http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream&codec=vp9`

Browser support: Chrome/Edge M29+, Firefox M28+, Opera M16+. Safari does not support VP9. Use H.264 if you need RTMP/HLS conversion,
DVR recording, or Safari compatibility.

## G.711 Codec Support

SRS supports G.711 (PCMU/PCMA) audio codec for WebRTC since v7.0.124 ([#4075](https://github.com/ossrs/srs/issues/4075)).
G.711 is a widely-used, royalty-free audio codec with excellent compatibility across VoIP systems, IP cameras, and legacy telephony equipment.
SRS implements G.711 as relay-only (SFU mode), accepting G.711 audio streams via WHIP and forwarding to WHEP players without transcoding.
G.711 streams cannot be converted to RTMP/HLS or recorded to DVR.

To use G.711, add the `acodec=pcmu` or `acodec=pcma` query parameter to WHIP/WHEP URLs:

* Publish with PCMU: `http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&acodec=pcmu`
* Play with PCMU: `http://localhost:1985/rtc/v1/whep/?app=live&stream=livestream&acodec=pcmu`
* Publish with PCMA: `http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&acodec=pcma`

You can also combine video and audio codec parameters:

* VP9 + PCMU: `http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&vcodec=vp9&acodec=pcmu`
* H.264 + PCMA: `http://localhost:1985/rtc/v1/whip/?app=live&stream=livestream&vcodec=h264&acodec=pcma`

Browser support: All major browsers support G.711 (PCMU/PCMA). PCMU (μ-law) is prioritized over PCMA (A-law) when both are available.
Use Opus if you need RTMP/HLS conversion or DVR recording.

## SFU: One to One

Please enable WebRTC, or use `conf/rtc.conf` as config.

```bash
export CANDIDATE="192.168.1.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_HTTP_REMUX_ENABLED=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

> Note: Please set CANDIDATE as the ip of server, please read [CANDIDATE](./webrtc.md#config-candidate).

Then startup the signaling, please read [usage](https://github.com/ossrs/signaling#usage):

```bash
docker run --rm -p 1989:1989 ossrs/signaling:1
```

Use HTTPS proxy [httpx-static](https://github.com/ossrs/go-oryx/tree/develop/httpx-static#usage) as api gateway:

```bash
export CANDIDATE="192.168.1.10"
docker run --rm -p 80:80 -p 443:443 ossrs/httpx:1 \
    ./bin/httpx-static -http 80 -https 443 -ssk ./etc/server.key -ssc ./etc/server.crt \
          -proxy http://$CANDIDATE:1989/sig -proxy http://$CANDIDATE:1985/rtc \
          -proxy http://$CANDIDATE:8080/
```

To open [http://localhost/demos/one2one.html?autostart=true](http://localhost/demos/one2one.html?autostart=true)

Or by the IP [https://192.168.3.6/demos/one2one.html?autostart=true](https://192.168.3.6/demos/one2one.html?autostart=true)

> Note: For self-sign certificate, please type `thisisunsafe` to accept it.

## SFU: Video Room

Please follow [SFU: One to One](./webrtc.md#sfu-one-to-one), and open the bellow demo pages.

To open [http://localhost/demos/room.html?autostart=true](http://localhost/demos/room.html?autostart=true)

Or by the IP [https://192.168.3.6/demos/room.html?autostart=true](https://192.168.3.6/demos/room.html?autostart=true)

> Note: For self-sign certificate, please type `thisisunsafe` to accept it.

## Room to Live

Please follow [SFU: One to One](./webrtc.md#sfu-one-to-one), and please convert RTC to RTMP, for FFmpeg to mix the streams.

```bash
export CANDIDATE="192.168.1.10"
docker run --rm --env SRS_RTC_SERVER_CANDIDATE=$CANDIDATE \
  --env SRS_RTMP_LISTEN=1935 --env SRS_HTTP_API_ENABLED=on --env SRS_HTTP_SERVER_ENABLED=on \
  --env SRS_RTC_SERVER_ENABLED=on --env SRS_VHOST_RTC_ENABLED=on --env SRS_VHOST_HTTP_REMUX_ENABLED=on \
  --env SRS_VHOST_RTC_RTMP_TO_RTC=on --env SRS_VHOST_RTC_RTC_TO_RTMP=on \
  -p 1935:1935 -p 8080:8080 -p 1985:1985 -p 8000:8000/udp \
  ossrs/srs:8 \
  objs/srs -e
```

If use FFmpeg to mix streams, there is a FFmpeg CLI on the demo page, for example:

```bash
ffmpeg -f flv -i rtmp://192.168.3.6/live/alice -f flv -i rtmp://192.168.3.6/live/314d0336 \
     -filter_complex "[1:v]scale=w=96:h=72[ckout];[0:v][ckout]overlay=x=W-w-10:y=H-h-10[out]" -map "[out]" \
     -c:v libx264 -profile:v high -preset medium \
     -filter_complex amix -c:a aac \
     -f flv rtmp://192.168.3.6/live/merge
```

Input:
* rtmp://192.168.3.6/live/alice
* rtmp://192.168.3.6/live/314d0336

Output:
* rtmp://192.168.3.6/live/merge

Winlin 2020.02

## IPv6

SRS (v7.0.67+) supports IPv6 for WebRTC protocols, enabling dual-stack (IPv4/IPv6) operation for both UDP and TCP media transport. This includes support for WHIP/WHEP signaling and media transmission over IPv6.

IPv6 support is enabled automatically when SRS detects IPv6 addresses in the configuration. Configure the RTC server to listen on IPv6 addresses:

```bash
rtc_server {
    enabled on;
    # Listen on both IPv4 and IPv6 for UDP media
    listen 8000 [::]:8000;

    # For WebRTC over TCP
    tcp {
        enabled on;
        listen 8000 [::]:8000;
    }
}

# HTTP API server for WHIP/WHEP over IPv6
http_api {
    enabled on;
    listen 1985 [::]:1985;
}

# HTTPS API server for secure WHIP/WHEP over IPv6
https_api {
    enabled on;
    listen 1990 [::]:1990;
    key ./conf/server.key;
    cert ./conf/server.crt;
}
```

Publish using WHIP via IPv6:
- WHIP URL: `http://[::1]:1985/rtc/v1/whip/?app=live&stream=livestream`
- Test page: [http://[::1]:8080/players/whip.html](http://[::1]:8080/players/whip.html)

Play using WHEP via IPv6:
- WHEP URL: `http://[::1]:1985/rtc/v1/whep/?app=live&stream=livestream`
- Test page: [http://[::1]:8080/players/whep.html](http://[::1]:8080/players/whep.html)

For secure connections over IPv6:

Publish using WHIP via HTTPS IPv6:
- WHIP URL: `https://[::1]:1990/rtc/v1/whip/?app=live&stream=livestream`
- Test page: [https://[::1]:8088/players/whip.html](https://[::1]:8088/players/whip.html)

Play using WHEP via HTTPS IPv6:
- WHEP URL: `https://[::1]:1990/rtc/v1/whep/?app=live&stream=livestream`
- Test page: [https://[::1]:8088/players/whep.html](https://[::1]:8088/players/whep.html)

SRS supports dual-stack WebRTC, allowing both IPv4 and IPv6 clients to connect simultaneously:

```bash
rtc_server {
    enabled on;
    # Listen on both IPv4 and IPv6
    listen 8000 [::]:8000;

    # Configure candidates for both protocols
    candidate 192.168.1.100 [2001:db8::1];
}
```

This enables:
- IPv4 clients to connect via: `http://192.168.1.100:1985/rtc/v1/whip/`
- IPv6 clients to connect via: `http://[2001:db8::1]:1985/rtc/v1/whip/`

## Known Limitation: Initial Audio Loss

When publishing WebRTC streams, you may notice that the **first 4-6 seconds of audio are missing** in recordings (DVR),
RTMP playback, or HTTP-FLV streams. This is a **known limitation** of WebRTC's audio/video synchronization mechanism,
not a bug.

**Root Cause**: WebRTC uses RTCP Sender Reports (SR) to synchronize audio and video timestamps. When a WebRTC stream
starts, both audio and video RTP packets arrive immediately. However, SRS needs RTCP Sender Reports to calculate proper
timestamps for synchronizing audio and video. The A/V sync calculation requires **TWO** RTCP Sender Reports to establish
the timing rate between RTP timestamps and system time. All RTP packets (both audio and video) with `avsync_time <= 0`
are **discarded** to avoid timestamp problems in the live source. RTCP Sender Reports typically arrive every 2-3 seconds.
After the **second** SR arrives (~4-6 seconds), the A/V sync rate is calculated, and packets start being accepted. If DVR
is configured with `dvr_wait_keyframe on`, recording starts at the first video keyframe anyway. Video keyframes typically
arrive every 2-4 seconds, so by the time the first keyframe arrives, A/V sync is often already established. However, audio
packets that arrived before sync was established are **permanently lost**.

**Why This Won't Be Fixed**: This is a **fundamental limitation** of WebRTC's A/V synchronization mechanism. The RTCP-based
A/V synchronization is essential for WebRTC. Without it, audio and video timestamps would be misaligned, causing severe sync
issues throughout the entire stream. The current design prioritizes **correct A/V synchronization** over capturing the first
few seconds. This is a reasonable trade-off for most live streaming scenarios where streams run for extended periods (minutes
to hours), losing 4-6 seconds at the start is acceptable, and perfect A/V sync throughout the stream is critical. Fixing this
would require fundamentally redesigning the WebRTC A/V sync mechanism, which is extremely complex and risky.

**Related Issues**: [#4418](https://github.com/ossrs/srs/issues/4418), [#4151](https://github.com/ossrs/srs/issues/4151),
[#4076](https://github.com/ossrs/srs/issues/4076)

![](https://ossrs.io/gif/v1/sls.gif?site=ossrs.io&path=/lts/doc/en/v7/webrtc)

