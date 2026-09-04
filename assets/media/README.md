# Alpine Blue Adventure / Pattern A

Adopted photo direction: blue sky, white clouds, green mountains, small dark touring motorcycles, natural premium daylight. Adventure Orange remains the action color.

Six standalone photos were generated using the built-in image_gen tool from the approved contact-sheet reference. They are new renderings matching that direction, not crops of the comparison sheet. WebP outputs live in assets/images; the original home-touring-hero.png is retained.

## Production prompt set

Shared constraints: one full-bleed photoreal photograph, premium natural daylight, blue and green grading, no text, board, labels, borders, watermark or logos.

- alpine-home-poster.webp (1080 x 1920): Reproduce panel 01, alpine valley and winding road, small black motorcycle ridden away in lower middle, portrait 9:16, upper 40 percent uncluttered sky for white app logo.
- alpine-create-hero.webp (1600 x 650): Panel 02, rider POV, subtle black handlebars and mirrors at bottom edge, road forward into deep green mountains, fresh blue sky and soft white clouds.
- alpine-confirm-hero.webp (1600 x 500): Panel 03, calm blue alpine lake, deep green mountains, small black motorcycle parked at far right, uncluttered scenic left area for title.
- rides/ride-mountain-01.webp (1200 x 360): Panel 04, deep evergreen forest and mountain switchbacks on right, tiny dark rider, blue sky, scenery and rider retained in central band.
- rides/ride-coast-01.webp (1200 x 360): Panel 05, azure ocean left, curving coast road right, small dark rider traveling away, green rocky coast and white clouds.
- rides/ride-bridge-01.webp (1200 x 360): New bridge scene using approved color direction; long concrete bridge over blue alpine lake towards green mountains, tiny dark rider, blue sky and clouds.

Saved cards cycle mountain/coast/bridge as decorative photos only. They do not classify the actual route or alter saved data. Mountain is the default placeholder.

## Home loop

- 720 x 1280, 24 fps, exactly 8 seconds, no audio.
- MP4: H.264 Main, yuv420p, faststart; WebM: VP9 fallback.
- Generated from the adopted home poster, with a smooth 2.5 percent zoom in and out. This is photo-based camera motion; the rider and clouds do not move independently.
- Animation shape: z = 1 + 0.0125 * (1 - cos(2 * PI * frame / 192)).
- FFmpeg export: scale=1440:2560,zoompan=z='1+0.0125*(1-cos(2*PI*on/192))':x='iw/2-iw/zoom/2':y='(ih-ih/zoom)*0.6':d=192:s=720x1280:fps=24; 192 frames; libx264, preset slow, CRF 25, profile main, level 3.1, pix_fmt yuv420p, movflags +faststart. WebM transcode: libvpx-vp9, bitrate 0, CRF 34.
- hero-media.js owns only decorative media: load when visible, pause offscreen/hidden, pause/resume control, autoplay rejection retry, poster on failure.
- Reduced motion and Save-Data skip initial video loading; poster remains available. No route, storage, map or navigation logic is modified.

## Verification

Local Edge: home, create, AI consult, confirm and saved screens; route form -> confirmation -> save -> reload; widths 320/360/390/768/1280; no horizontal overflow in create view; no console or page errors in ordinary flow. Video decodes at 720 x 1280 / 8 s, loops, pauses/resumes, pauses after navigating away, resumes on return. Reduced motion makes zero media requests. Aborted video request retains poster.

Safari/iPhone hardware is not available in this environment; actual Safari playback remains to be checked. No deployment or git commit performed.