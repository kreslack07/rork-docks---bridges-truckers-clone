# Fix remaining 3 issues from app review

## What's being fixed

**1. Onboarding finish button has no loading feedback**
- When tapping "Start Using App", the button just dims slightly with no clear loading indicator
- Will add a spinning indicator and change the button text to "Setting up..." so it's obvious something is happening

**2. Profile screen — truck settings buried at the bottom**
- The truck edit form is easy to miss because it's at the very bottom of a long scrollable page
- Will move it higher up the page, right after the hero section, so it's one of the first things you see

**3. Route service — inconsistent error behavior**
- When searching for an address fails, it silently returns nothing; when fetching a route fails, it also returns nothing but in a different way
- Will make both behave the same way — returning empty/null consistently and logging clearly

*Note: The `boxShadow` web typing issue and the "map screen overloaded" UX concern are minor/subjective and won't be changed in this pass. The RefObject null check and rate-limit retry are already properly guarded in the current code.*