# Latin subsets of the site's web fonts

The site serves these instead of the full fonts (`lib/html.mjs` FONTS): the same outlines, kerning and
OpenType features, but only the characters a page can show — Basic Latin, Latin-1, Latin Extended-A and -B
(player names such as Dončić or Porziņģis, the Turkish pages), dashes, quotes, arrows and a few signs. 295 KB of
fonts became 205 KB, and the home page's largest paint came 0.5 s sooner on Lighthouse's slow-4G phone (2026-10-30).

IBM Plex Mono stays whole: its license reserves the name "Plex", so a modified copy would need a new name.
The other four families are under the SIL Open Font License with no reserved name; their licenses ship with
the site (`desk-src/fonts/OFL-*.txt`, copied to `/assets/`).

Made with fontTools 4.55.3, from the files the paths name:

    U="U+0020-007E,U+00A0-024F,U+2010-203A,U+2190-2193,U+2212,U+20AC,U+2122,U+2713,U+2717"
    for src in desk-src/fonts/Fraunces_900Black.ttf site-src/fonts/Fraunces_900Black_Italic.ttf \
               desk-src/fonts/Fraunces_700Bold.ttf desk-src/fonts/Fraunces_400Regular_Italic.ttf \
               desk-src/fonts/LibreFranklin_400Regular.ttf site-src/fonts/LibreFranklin_700Bold.ttf \
               desk-src/fonts/Doto_900Black.ttf; do
      pyftsubset "$src" --unicodes="$U" --layout-features='*' --output-file="site-src/fonts/latin/$(basename "$src")"
    done

A page that needs a character outside these ranges falls back to the system font for that character only.
