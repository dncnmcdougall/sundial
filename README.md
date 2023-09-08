# Sundial

This was born as a visualisation for sunrise and sunset times. There is a
surprising dearth of good visualisations for this. Most have a full world map.
Even the expected horizontal bar is rare. This may have been inspired by various
visualisations in games.

The goal is to make a widget that gives an intuitive view of where we are in the
day both time wise and daylight wise. The circle represent 24 hours  (in
contrast to the 12 hours.[^1]) Then a line is drawn from sunrise to sunset. And
the current time is represented by a sun rotating around the circle. When it is
above the line it is daytime, when it is below the line it is night.

This visualisation has some serendipitous properties. First it makes visualising
the season easy. When the horizontal line is above the 6h00-18h00 line it is
winter (there is less than 12 hours of sunlight) and when below it is summer
(more than 12 hours of sunlight.) Next it helps understand the nature of a
time zone in how it aligns to the natural rhythm of people. For instance in the
UK shops open at 9am typically.  This is because their time zone is west of its
"natural" position, so the sun rises late and people start late. This is in
contrast to Johannesburg which is east of its time zone and so life starts
earlier. Thirdly, it makes comparing time zones easy. Simply plot several places
and see, visually, how they differ.

[^1] Surprisingly I have not found the 24 hour nature of this to be difficult. 

## Usage

The sundial shows the visualisation. The blue dashed lines connect midnight to
noon and 6am to 6pm. On the equinox a "naturally" aligned time zone on the equator would have
sunrise at 6am, noon and 12am and sunset at 6pm.

The drawing gets its time from the system clock. But it does not know where you
are. To specify what time zone it should draw with specify the 'Home' to be the
place you want, or UTC. Sunrise and sunset are specified at the time they would
occur in this home time zone. So if home is UTC (+0) and Seoul is a place (+9).
Then sunrise might be at 9pm (in summer), 

Each place is rendered as a black line connecting sunrise to sunset in the home
time zone. In addition, the name of the place is printed on the sunny side of
the line on the sunrise edge. 

To create a place press the add button and give the new place a name. You must
also specify the latitude (North-South) and Longitude (East-West) values and the
time zone. Once all this is specified the place will be drawn as a black line
between sunrise and sunset. A place can be deleted by pressing the remove button
just below its details.

This page is designed to be stateless so all the place details are encoded in
the url. Simple "Save" to load the URL of your current setup. This URL can be
shared freely and will result in the same setup. (Although I make no promises
about backwards compatibility)

## Technical details

The sunrise/sunset times are calculated based on the [sunrise equation](https://en.wikipedia.org/wiki/Sunrise_equation) using the specified
coordinates. This uses the latitude and longitude. Currently, the altitude is
ignored, although the equation does have space for this.

The available time zones are extracted from the freely available data provided by
[https://www.geonames.org/](https://www.geonames.org/). 

The home time zone is the one where noon will be at the top centre of the
circle. More intuitively the home time zone have the wall clock time at sunrise
when the sun is rising in that place.

The code is built on top of my
[ModelReducer](https://github.com/dncnmcdougall/ModelReducer) code for storing
the state and on the excellent [PReact](https://preactjs.com/) code for
rendering the webpage.

## Further work

Well first, entering places is clunky! In addition, the geonames data has places
with time zones and coordinates. An improvement would be to use that data. This
is a challenge as doing so naively results in a very heavy webpage: Initially I
thought to use the specified lat and long to lookup the place and time zone, but
the appropriate JS file is 8Mb! More ergonomic (but with lower resolution) may
be to only provide a place lookup for "major settlements". This may result in a
sufficiently small webpage. An alternative would be to create a query able
static database like [Hosting SQLite databases on Github Pages](https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/).

Another neat trick would be to include the weather at home around the outised of
the circle.

