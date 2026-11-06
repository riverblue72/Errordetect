# Change-limit development gate

The fixed `.75 × original MMD limit` trial in
[CHANGE_LIMIT_PROTOCOL.md](CHANGE_LIMIT_PROTOCOL.md) reproduced every saved
original alert on the five development recordings before evaluating the
candidate. Its source-derived original limit was 0.063927 and the fixed
candidate limit was 0.047945. The multiplier was selected using the known
missed development join, as disclosed in the protocol.

| Development comparison | Original limit | Candidate limit |
| --- | ---: | ---: |
| Known recording joins alerted | 4 / 5 | **5 / 5** |
| Median delay among alerted joins | 96 frames | 96 frames |
| Alerts before the known join | 0 | 0 |
| Confirmed alerts on 16,518 later frames of the source recording | 0 | 0 |
| Individual source-continuation windows above limit | 0 / 513 | 2 / 513, neither consecutive |

The recovered join is `T1_S148_I108_2`, confirmed 448 frames after the
recording boundary. The other four joins retain their 96-frame first alert.
This passes the prespecified development gate for evaluating the candidate on
the sixteen extended recordings. It does **not** prove that the lowered limit
is safe under other stable material or camera conditions.

Machine-readable result:
[`results/change_limit_development.json`](results/change_limit_development.json).
The candidate protocol and code were committed as `4ed4a68` before this
development result and before evaluating the extended runs.
