# Streamer showcase

[Back to Streamer mode](streamer.md)

The Streamer page accepts a display name, a Twitch/YouTube/Kick channel URL, and permission to publish those two fields. Every new channel is **pending**. Only approved channels are returned by the public API and shown as cards. The site ships with no sample channels or implied endorsements.

## Hosting and storage

`/.netlify/functions/streamers` uses a separate, strongly consistent Netlify Blobs store, `dualsense-streamer-showcase`. It is created on the first accepted submission. Deploy it through the existing Netlify project; no separate database or public administrator token is needed. The plain static localhost preview cannot receive submissions. Use Netlify dev for a working local API or the deployed site for real submissions.

Channel URLs are restricted to HTTPS channel pages on Twitch, YouTube, or Kick; redirects, video links, credentials, unsupported hosts, and generic platform pages are rejected. Tracking queries and fragments are removed. The server requires explicit consent, checks same-origin submissions, stops reading bodies once they exceed 2 KB, uses a honeypot, and permits at most five attempts per IP per hour. The IP must come from Netlify's trusted request context; missing or invalid context rejects submissions, and visitor-supplied forwarding headers cannot replace it. Rate-limit keys contain a hash, not the raw IP. The queue holds at most 1,000 records; contact support if it fills up. These measures reduce abuse; they do not prove that someone owns or uses the submitted channel, and the Origin header alone does not authenticate a caller.

The function also declares a Netlify edge rate limit of 60 requests per IP and domain per minute, covering reads as well as submissions. After deployment, confirm that Netlify's post-processing log accepted the rule for `/.netlify/functions/streamers`. [Netlify rate-limit documentation](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/) explains that rejected rules do not fail a deployment and enforcement can be delayed. This is not an absolute spending cap or protection against distributed traffic from many IPs. Test abuse cases in an isolated preview, never by flooding production.

Public retries for an existing channel never overwrite its name, URL, or review state. Pending and rejected records, moderation IDs, and submission/review timestamps are not public. No email is collected. Click and submission analytics include only the surface and platform, never the submitted name or URL.

## Review channels

Review with the local command using an authorized Netlify account. The public endpoint cannot list pending records or approve/reject them, even if a visitor sends moderation fields.

Make `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` available in your terminal environment using your existing Netlify access. The token needs access to this site's Blobs store. Keep it out of source files and the website. The site ID is shown in the Netlify project configuration; a personal access token is managed in your Netlify account.

This is a public repository: publishing the review command does not grant Netlify access. Keep account credentials, environment files, and exported submissions out of commits and the published website. Before pushing, inspect the exact staged files and scan for credentials; a public endpoint or store name must never be treated as a secret or as authorization.

```sh
npm run streamers:review -- list
npm run streamers:review -- approve CHANNEL_ID
npm run streamers:review -- reject CHANNEL_ID
```

`list` prints all submissions and their state. Before approving, inspect the channel and check that its name and use of DualSense Studio are appropriate for the showcase. Approvals appear after the visitor reloads the page, without rebuilding the site. Rejecting an approved channel removes it from subsequent public responses. Both decisions can be reversed by running the other command. There is no public admin page or password embedded in the app.

## Verification

Run `node --test tests/streamer-showcase.test.mjs tests/analytics-coverage.test.mjs tests/seo.test.mjs` after `npm run build`. Coverage includes URL validation, private pending/rejected data, concurrent and duplicate submissions, review transitions, public moderation attempts, rate limits, and unavailable hosting.

For manual checks, use a separate preview environment: open **Add your channel**, try invalid input, submit a channel with consent, confirm it stays absent from the public list, approve it with the review command, and reload. Reject it and confirm it disappears. Never seed test streamers into the production showcase.
