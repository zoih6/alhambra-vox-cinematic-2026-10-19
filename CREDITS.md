> **Current edition: layered-v5.** Duration 336.1875 seconds / 10,758 frames at 32fps. The user-selected sung source interval is exactly **10:18.670–11:30.000** (71.330 seconds), with 13.75 ms of silent video-grid padding, not extra source audio. Earlier editions are retained in the project history.

**المونتاج والتصميم بواسطة شذى ياسر**

# المصادر والتراخيص / Credits and provenance

## Film

**الحمراء — قصيدة من حجر / Alhambra — A Poem in Stone**

Arabic narration and the complete script were supplied by the project owner. The muwashah revision replaces the narrator’s spoken opening lyric quote with 71.330 seconds of the supplied sung recording, then resumes the original narrator without time-stretching or regenerated speech. The source narration file is retained unchanged. The revised duration is 336.1875 seconds (10,758 frames at 32fps), including a seven-second end credit.

**المونتاج والتصميم بواسطة شذى ياسر** — on-screen credit requested by the project owner.

## Genuine photographs

1. **Jebulon — Nasrid motto, Alhambra, Granada, Andalusia, Spain.** CC0. Source: https://commons.wikimedia.org/wiki/File:Nasrid_motto_Alhambra_Granada_Andalusia_Spain.jpg
   - Used as genuine epigraphy. Cropped, scaled, and composited; the original lettering was not rewritten.
2. **Miquel Rosselló Calafell — Buildings On A Mountain / Alhambra panorama.** Pexels License. Source: https://www.pexels.com/photo/buildings-on-a-mountain-3049735/
   - Skyline isolation, crop, restrained color treatment and depth-layer composition.
3. **Enrique — Dawn over Medieval Castle on Hill.** Pexels License. Source: https://www.pexels.com/photo/dawn-over-medieval-castle-on-hill-13341148/
   - Cropped into paper-photo elements with motion and color treatment.
4. **Jebulon — Patio de los Arrayanes detail, Alhambra, Granada, Spain.** CC0. Source: https://commons.wikimedia.org/wiki/File:Patio_de_los_Arrayanes_detail_Alhambra_Granada_Spain.jpg
   - Genuine Court of the Myrtles photo, cropped and composited.
5. **Jebulon — Fountain patio de los Leones, Alhambra, Granada, Spain.** CC0. Source: https://commons.wikimedia.org/wiki/File:Fountain_patio_de_los_Leones_Alhambra_Granada_Spain.jpg
   - Genuine Fountain of the Lions photograph, cropped and composited. The accompanying twelve dots are a count diagram, not an architectural survey.
6. **Sharon Mollerus — Muqarnas Dome, Alhambra, Granada, 6/30/11.** CC BY 2.0. License: https://creativecommons.org/licenses/by/2.0/
   - Source: https://commons.wikimedia.org/wiki/File:Muqarnas_Dome,_Alhambra,_Granada_6_30_11_-architecture_-islamic_-palace_(25092731377).jpg
   - Changes: crop, resize, restrained color treatment, paper mask, parallax and depth-of-field treatment. No endorsement by the photographer is implied.

Full downloaded rights metadata is preserved in `research/asset-provenance-photos.json`, `research/asset-provenance-pexels.json`, `research/additional-photo-provenance.json` and `research/lions-photo-provenance.json`.

Pexels License: https://www.pexels.com/license/

## Maps, fonts and generated material

- **Natural Earth:** public-domain country geometry. The Granada marker is placed at approximately 37.1761° N, 3.5881° W. Local relief, aqueduct sections and architectural layers are explanatory diagrams, not measured archaeological reconstructions.
- **Alexandria and Amiri:** SIL Open Font License. Font files and their license texts are included in `assets/fonts/`.
- **Generated conceptual stone fragment** and **two generated cinematic foundation plates:** authored visual metaphors. They are not authentic historical artifacts or archival photographs. The genuine architecture photographs remain the documentary reference. The plates are separated into deterministic depth mattes for camera parallax.
- Dust, warm light, masks, paper textures, count diagrams, key illustration and sound effects are programmed for this film. Dust appears only within the light field; it is not a generic particle transition.

## Supplied audio

Source repository: https://github.com/zoih6/alhambra-film-assets

- `voiceover_narration.mp3`: original source retained. The authorized playback edit removes 168.40625–175.96875 seconds; everything else is kept in order, with subsequent material shifted later to accommodate the song.
- `background_music_option_2.mp3`: selected as a quiet, ducked musical bed; looped using an eight-second equal-power crossfade.
- `background_music_option_1.mp3`: retained as an unused alternative.
- `muwashah_en_al_andalus.m4a`: **used in the muwashah revision**. Embedded metadata identifies the recording as **Sami Yusuf — En al-Ándalus**, album **Alma**. The selected contiguous excerpt is 10:18.670–11:30.000. During this performance, neither the narrator nor the previous background score is layered over it. The performance tempo is unchanged.

The project owner supplied and authorized publication of these files. Their inclusion is not a blanket license grant for third-party reuse; underlying audio rights were not independently established. Do not assume the code license applies to supplied audio or photographs.

## Historical and numerical notes

- Alhambra history and palace context: [2](https://www.britannica.com/topic/Alhambra-fortress-Granada-Spain).
- Fountain, twelve lions, 124 columns and Ibn Zamrak's fountain poem: [15](https://www.alhambradegranada.org/en/info/nasridpalaces/patioofthelions.asp).
- The 2025 visitor graphic uses **approximately 2.7 million**, based on the Andalusian government's published count of 2,726,871 for 2025; it is not an unqualified timeless annual figure. [7](https://juntadeandalucia.es/organismos/culturaydeporte/servicios/actualidad/noticias/detalle/636016.html).
- The last-sigh/crying story is visibly labeled **رواية شعبية** rather than presented as verified footage. [9](https://www.elindependientedegranada.es/cultura/ultimo-suspiro-moro-que-invento-obispo-guadix).
- Charles V's architectural intervention changed the site; the film does not invent demolition footage to prove a motive. [2](https://www.alhambra-patronato.es/edificios-lugares/palacio-de-carlos-v).
- The supplied narration contains poetic and debatable historical formulations. See `docs/creative-plan.md` for the editorial cautions. The voice recording was not silently rewritten.

## Production skills

- AI Film Studio v3.2.0, Waseem Alzobiri / zoih6, MIT: https://github.com/zoih6/ai-film-studio
- Motion Reel helper package, sourced from: https://github.com/zoih6/ta3liq-sawti-khat-thuluth-211706577/tree/master/motion-reel

Both portable skills are preserved in the public repository's `vendor/` directory. Their rendering defaults were adapted to the actual project: Linux, horizontal 1920×1080, 32fps, original supplied narration, and no `out/` output directory.

## Original style references

All twelve user-supplied reference clips are also backed up, unmodified, in `references/style-reference-videos-originals.zip` in the public repository. They are reference material, not scenes from this produced film. The ZIP includes a source-commit note and SHA-256 manifest. Their underlying rights are not reassigned by this backup.

## V5 illustrative assets

Four new AI-generated conceptual assets are used: an imagined Ibn al-Ahmar portrait, an imagined Ibn al-Khatib portrait, mason hands placing a sandstone block, and an illustrative medieval-style key. They are not authentic historical portraits or claimed surviving artifacts. The person images are labeled as imagined on screen. Original green-background images, cleaned RGBA cutouts, detail partitions and integrity records are preserved in the project. They do not replace the genuine location photographs as evidence.

V5 animation preserves native Arabic shaping before masking its bodies and marks. The final cut was implemented using a deterministic Canvas/Playwright/FFmpeg compositor, not an Adobe After Effects project file.
