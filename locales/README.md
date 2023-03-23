this directory contain special files that are helpful in making the library
localised.

## get.ts

this file gets all languages & locations available from Youtube Music and writes
them to the file called `locales.json`.

Note that only the languages/locations it discovered will be used in the
library, and attempting to use a language/location that is not in the file will
result in an error.

## strings.ts

This file is used to generate the `strings.json` file. This file contains the
required localised strings for the library to work. These strings are used when
parsing responses, to get for example "new albums", "new songs" etc.

It's important that all the file does not log any missing strings, as this will
cause users of that language to miss some data.
