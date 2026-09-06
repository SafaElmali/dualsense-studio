# DualSense Studio SEO audit

Audited 6 September 2026. Scope: the live public domain and aliases, the homepage, and the local Streamer/OBS build. This document records the audit snapshot before deployment. The homepage fixes are included in this SEO release; Streamer/OBS fixes described below remain in the separate local workspace. The five proposed streamer features are on hold.

## Outcome

The live homepage is reachable over valid HTTPS. Its main gaps were discoverability and page identity: generic branding and description, no HTML canonical, no sitemap, no sharing metadata or image, and no structured site information. Useful tool explanations were mostly in dialogs. These gaps have been addressed in the local build.

This is a technical and on-page audit, not a claim that Google has indexed the site or that a ranking/performance score has improved. No Search Console account data was accessed. Google's public PageSpeed API returned HTTP 429, so no Lighthouse score or field Core Web Vitals assessment is available from this audit.

## Live findings and local fixes

| Area | Evidence from the live site | Local result |
| --- | --- | --- |
| HTTPS | `https://dualsense.studio/` returned 200 with certificate verification enabled and HSTS. | Healthy at the time checked; no TLS settings changed. |
| HTTP and www | Both resolved to the HTTPS apex homepage. | Existing behavior works. Explicit www redirect is also in Netlify configuration. |
| Old Netlify address | Returned the same page with 200; its HTTP Link header pointed at the custom domain. | Added a permanent domain redirect to dualsense.studio, preserving paths and query parameters. Requires deployment to verify edge behavior. |
| Canonical identity | No HTML canonical. `/index.html` also returned 200. | Exactly one absolute canonical per indexable page. Homepage variants and preset queries point to `/`; Streamer appearance queries point to `/streamer.html`. |
| Titles and descriptions | “DualSense — Interactive controller” and a short generic description. | Unique descriptions and titles for the PS5 controller tester and OBS overlay builder. |
| Site name | Visible branding emphasized PlayStation / Controller Studio. | Consistent DualSense Studio name in header, H1, metadata and WebSite data; independent-project attribution remains visible. |
| Social sharing | No Open Graph or Twitter card tags. | Large-image metadata with absolute URLs, dimensions and alt descriptions. Added a 1200×630 PNG with an original vector illustration and retained its editable SVG source. |
| Icons | SVG favicon only. | Kept SVG; added 48×48 PNG favicon and 180×180 Apple touch icon. |
| Sitemap | `/sitemap.xml` returned 404. | The homepage-only release sitemap includes only the public homepage, with no query variants or invented modification dates. |
| Robots | `/robots.txt` returned 404. This alone did not prevent indexing. | Explicit crawl permission, sitemap discovery, and a crawl exclusion for backend function endpoints. CSS, scripts and images remain crawlable. |
| Capture/indexing | Public Streamer and overlay URLs returned 404; Streamer remains unreleased. Local overlay already had noindex. | Capture HTML keeps noindex, follow; both short and .html routes receive the same header. Overlay remains crawlable so search engines can see noindex. |
| Structured data | None in the homepage HTML. | WebSite, WebPage and WebApplication JSON-LD describe the actual product. No fabricated reviews, ratings, offers or search action. |
| Search-readable content | Tool descriptions were brief or inside dialogs. | Added static feature descriptions plus six useful FAQs. Content exists in the initial HTML without WebGL or JavaScript. |
| Accuracy | Drift testing and repair can be confused. | Visible copy distinguishes diagnostics from repair/calibration, explains device permissions and browser requirements, and accurately describes the input methods available in the shipped version. |
| Mobile and usability | Existing responsive layout. | Verified the changed page at desktop size, 390×844 and 320×740: no horizontal overflow, stacked feature cards, readable FAQ expansion, and controller view still renders. Added keyboard skip link and noscript guidance. |
| Missing pages | A nonexistent public path correctly returned 404. | Added a branded 404 page with noindex and an absolute home link. Netlify serves `404.html` for missing files; no catch-all 200 rewrite was added. |
| Build and local links | Build previously shipped only app pages and controller files. | Build now includes robots, sitemap, 404 and sharing assets. Automated checks validate their actual publish output and local references. |

## Performance and rendering

The application serves its 3D assets and Three.js locally, with no third-party font dependency. Text and basic page structure are present before JavaScript runs. The new descriptions and FAQs need no script and the social image is metadata only, not an extra image in the homepage viewport.

The existing `controller/dualsense.glb` is approximately 6 MiB. The two primary Three.js modules are approximately 700 KiB combined before transfer compression. These are meaningful costs on slower devices or connections, but file sizes alone do not establish LCP, INP or CLS. Geometry/texture compression should be a separate measured change: the model is split into interactive components, so changing geometry can affect button detection and animation. No unverified model optimization was applied.

The browser checks found no JavaScript errors after the changes. The model rendered and the existing camera and controller diagnostics opened successfully. This is not a full accessibility certification, device compatibility matrix, or physical gyro/OBS validation.

## Search intent and content direction

The homepage now describes the actual tasks people can perform: a PS5 controller test, stick drift check, button/trigger diagnostics, gyro aiming and touchpad drawing. The Streamer page describes a PS5 controller overlay for OBS, and already contains setup instructions. These terms describe real features; search volume, keyword difficulty and competitor rankings were not measured.

Do not create multiple near-identical pages for each keyword or put hidden keyword lists in the page. Separate guides can be useful later if they explain a distinct task in depth, such as interpreting resting stick measurements or troubleshooting browser permissions. FAQs are user help; this site does not claim eligibility for Google's restricted FAQ rich results. WebApplication markup also does not guarantee a software-app rich result.

## Validation

Run `npm run test:seo`. It builds the publish folder and verifies:

- Unique titles/descriptions, one canonical per indexable page, language and H1.
- Social image existence, real PNG format, 1200×630 dimensions and alt descriptions.
- Sitemap URLs agree with canonical/indexing policy; capture and error pages are excluded.
- Parseable structured data with matching site/app identities and no fabricated ratings.
- Static local asset/link targets, same-page anchors and duplicate element IDs.
- Key feature descriptions and limitations are present without rendering JavaScript.

These six SEO checks passed; 14 targeted checks passed including existing analytics and range presentation coverage. The build, Netlify configuration parsing and `git diff --check` passed. Desktop and mobile visual checks passed; FAQ expansion and keyboard skip navigation worked. Netlify routing/header changes still require verification on a deployed build because the plain local preview server does not implement Netlify rules.

## Release and owner follow-up

1. This SEO release is based on the public branch and excludes all unpublished Streamer/OBS files, controller-only gameplay changes and unrelated analytics edits. Its sitemap contains only `/`. Expand it when Streamer is released.
2. After deployment, confirm root, robots, sitemap and sharing PNG return 200. Check the old-domain redirect with a preset query and check that a missing URL still returns 404. Verify both overlay routes return noindex when Streamer ships.
3. In Google Search Console, verify the `dualsense.studio` domain property, submit `https://dualsense.studio/sitemap.xml`, then inspect the homepage and request indexing. Add a DNS verification record only if Search Console supplies one; no verification tokens were invented or DNS settings changed here.
4. Inspect the rendered HTML and selected canonical in Search Console after Google crawls. Structured data can also be checked with Google's Rich Results Test / Schema Markup Validator. Syntax checks here do not establish Google feature eligibility.
5. Test a shared link on the intended social platform after deployment. Old previews may remain cached even when metadata is correct.
6. Review Page Indexing, search queries, impressions and clicks once data accumulates. Use field Core Web Vitals when available, then a repeatable mobile lab test before prioritizing model compression. Check that Netlify preview/branch deployments carry noindex before sharing them publicly.

## References

- [Google: JavaScript SEO and canonical tags](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: site names and WebSite data](https://developers.google.com/search/docs/appearance/site-names)
- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: noindex must remain crawlable](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google: software app structured data requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Netlify: redirects, query parameters and custom 404 handling](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
