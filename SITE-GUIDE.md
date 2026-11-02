# Pinellas County Fire Conference website: organizer guide

## Pages
| Page | Address |
|---|---|
| Home | https://pinellascountyfireconference.com/ |
| 2027 Conference (what to expect + mailing list) | /2027/ |
| Share Photos (upload + photo release) | /share-photos/ |
| 2026 Photo Album | /photo-album/ |
| Contact | /contact/ |
| Organizer admin | /admin/ |

## One-time step: publish the database rules
Two features need the updated rules in `firestore.rules`:
- **Photos shown on the site** (Admin → select photos → ★ Show on site)
- **Extra sign-up details** (name, department, title) saved with each sign-up

To publish them:
1. Open https://console.firebase.google.com and choose the project **pcfc-photo-drop**.
2. Go to **Firestore Database → Rules**.
3. Replace everything there with the contents of `firestore.rules` from this repository, then click **Publish**.

Until then, everything else keeps working. Sign-ups save the email only, as before, and the extra details
still arrive in the Gmail alert. ★ Show on site shows an error message.

`storage.rules` does not need any change.

## Tag the links you post
Add `?src=` and a short tag to every link you share, for example:
- `https://pinellascountyfireconference.com/2027/?src=fb-nov`
- `https://pinellascountyfireconference.com/share-photos/?src=ig-story`

Each sign-up records the tag, and **Admin → 2027 sign-ups** shows a count per tag
("Where sign-ups came from"). Uploaded photos store it too, as the `source` detail.
The **Share-link maker** in Admin → Settings builds these links for you.
Links without a tag show as "direct".

## QR codes
- `qr-share-photos.png` → Share Photos (tag `qr-tent`), also used on `table-tent.html`
- `qr-2027-list.png` → 2027 mailing list (tag `qr`)
- The old `qr-code.png` is still in the repository, unchanged.

## Contact form
Messages go to **pinellascountyfireconference@gmail.com** through formsubmit.co, the same service as the
sign-up alerts. Replies go straight to the sender's email address. To change the address, edit
`contactEmail` at the top of `assets/site.js`.

## Updating text
Settings at the top of `assets/site.js`:
- `nextDates`: set to e.g. `"October 25–27, 2027"` once announced
- `lastDates`: dates of the most recent conference
- `uploadFolder`: change to `pcfc-2027` for next year's photo drop
- `albumUrl`, `facebook`, `instagram`: links

## Logo
`assets/img/badge-conference.webp`, `badge-conference.png` (200 px) and `badge-conference-600.png` (large, for flyers)
read **Pinellas County · Florida · Fire Conference**. The earlier "Fire Rescue" version (`badge.png`) is kept
but no longer used.
