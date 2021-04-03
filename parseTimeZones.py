from typing import List, Dict, Optional, Any
import math
import statistics
import json

timezones = {}

timezoneTree = {}

class TimeZone:
    def __init__(self, gmt, dst, raw):
        self.gmt = gmt
        self.dst = dst
        self.raw = raw
        self.count = 0

with open('./places/timeZones.txt','r') as timezoneFile:
    firstLine = True
    for line in timezoneFile:
        if firstLine:
            firstLine = False
            continue
        parts = line.split('\t')
        timezone = parts[1]
        GMT = parts[2]
        DST = parts[3]
        RAW = parts[4]

        if timezone in timezones:
            raise RuntimeError('Found duplicate timezone: %s' % timezone)

        timezones[timezone] = TimeZone(GMT, DST, RAW)

        parts = timezone.split('/')
        region = '/'.join(parts[0:-1])
        zone = parts[-1]

        if region not in timezoneTree:
            timezoneTree[region] = {}
        timezoneTree[region][zone] = [GMT,DST];

        if len(parts) > 2:
            print(timezone)
            print(region+' / '+zone)

class P:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def toJS(self) -> str:
        return '[%s,%s]' % (self.x, self.y)


class Box:
    def __init__(self, p1, p2):
        self.minP = P(min(p1.x, p2.x), min(p1.y,p2.y))
        self.maxP = P(max(p1.x, p2.x), max(p1.y,p2.y))
        self.centre = P((self.minP.x+self.maxP.x)/2, (self.minP.y+self.maxP.y)/2)
        self.diagonal = math.sqrt((self.minP.x - self.maxP.x)**2 + (self.minP.y-self.maxP.y)**2)

    def contains(self, p) -> bool:
        return self.minP.x < p.x and self.maxP.x >= p.x and self.minP.y < p.y and self.maxP.y >= p.y

    def toJS(self) -> str:
        return ' '.join([
            '{ "minP": %s,' % self.minP.toJS(),
            '"maxP": %s,' % self.maxP.toJS(),
            '"centre": %s}' % self.centre.toJS() 
            ])

class Place:
    def __init__(self, names, longitude, latitude, elevation, timezone):
        self.names = names
        self.p = P(longitude, latitude)
        self.elevation = elevation
        self.timezone = timezone

    def toJS(self) -> str:
        return ' '.join([
            '{ "names": [%s],' % (','.join([ '"%s"' % n for n in self.names])),
            '"longitude": %s,' % self.p.x,
            '"latitude": %s,' % self.p.y,
            '"elevation": %s,' % self.elevation,
            '"timezone": "%s"}' % self.timezone,
            ])

class Tree:
    def __init__(self, box: Box, maxLeafCount: int, minLeafD: float):
        self.NE: Optional[Tree] = None
        self.SE: Optional[Tree] = None
        self.SW: Optional[Tree] = None
        self.NW: Optional[Tree] = None

        self.box = box

        self.maxLeafCount = maxLeafCount
        self.minLeafD = minLeafD
        self.places: List[Place] = []

    def addPlace(self, place):
        if self.NE is None:
            self.places.append(place)
            if len(self.places) > self.maxLeafCount and self.box.diagonal > self.minLeafD:
                self.split()
        elif self.NE.contains(place):
            self.NE.addPlace(place)
        elif self.SE.contains(place):
            self.SE.addPlace(place)
        elif self.SW.contains(place):
            self.SW.addPlace(place)
        elif self.NW.contains(place):
            self.NW.addPlace(place)
        else:
            raise RuntimeError('Place "%s" not contained in a quadrant' % place.names[0])

    def contains(self, place):
        return self.box.contains(place.p)

    def getSubTrees(self):
        if self.NE is None:
            return []
        else:
            return [self.NE, self.SE, self.SW, self.NW]

    def split(self):
        self.NE = Tree(Box(self.box.centre, P(self.box.maxP.x, self.box.minP.y)), self.maxLeafCount, self.minLeafD)
        self.SE = Tree(Box(self.box.centre, self.box.maxP), self.maxLeafCount, self.minLeafD)
        self.SW = Tree(Box(self.box.centre, P(self.box.minP.x, self.box.maxP.y)), self.maxLeafCount, self.minLeafD)
        self.NW = Tree(Box(self.box.minP, self.box.centre), self.maxLeafCount, self.minLeafD)

        for p in self.places:
            if self.NE.contains(p):
                self.NE.addPlace(p)
            elif self.SE.contains(p):
                self.SE.addPlace(p)
            elif self.SW.contains(p):
                self.SW.addPlace(p)
            elif self.NW.contains(p):
                self.NW.addPlace(p)
            else:
                raise RuntimeError('Place "%s" not contained in a quadrant: %s' % (p.names[0], p.p.toJS()))
        self.places = []

    def stats(self) -> Dict[str, Any]:
        if self.NE is None:
            return {
                    "depth": 1,
                    "places": len(self.places),
                    "timezones": len(set([ p.timezone for p in self.places])),
                    "counts": [len(self.places)],
                    "sizes": [self.box.diagonal],
                    "nodes": 1
                    }
        else:
            stat = [ t.stats() for t in self.getSubTrees()]
            counts = []
            sizes = []
            for s in stat:
                counts.extend(s['counts'])
                sizes.extend(s['sizes'])
            return {
                    "depth": max([ s['depth'] for s in stat]) +1,
                    "places": max([ s['places'] for s in stat]),
                    "timezones": max([ s['timezones'] for s in stat]),
                    "counts": counts,
                    "sizes": sizes,
                    "nodes": sum([ s['nodes'] for s in stat]) +1
                    }
    
    def toJS(self) -> str:
        indent = '\n  '
        # lines = ['{ "box": %s,' % self.box.toJS()]
        lines = ['{ "centre": %s,' % self.box.centre.toJS()]
        if self.NE is None:
            lines.append('"NE": null, "SE": null, "SW": null, "NW": null,')
        else:
            lines.append('"NE": %s,' % indent.join( self.NE.toJS().split('\n')))
            lines.append('"SE": %s,' % indent.join( self.SE.toJS().split('\n')))
            lines.append('"SW": %s,' % indent.join( self.SW.toJS().split('\n')))
            lines.append('"NW": %s,' % indent.join( self.NW.toJS().split('\n')))
        if len(self.places) > 0 :
            lines.append('"places": [' )
            lines.append(',\n'.join( [ p.toJS() for p in self.places] )+ ']}')
        else:
            lines.append('"places": []}')
        return '\n'.join(lines)

places = []
populations = []

with open('./places/cities15000.txt', 'r') as citiesFile:
    cnt = 0
    for line in citiesFile:
        # if cnt > 100: 
        #     break
        cnt += 1
        parts = line.split('\t')
        names = [parts[1]]
        names.extend(parts[3].split(','))
        latitude = float(parts[4])
        longitude = float(parts[5])
        elevation = float(parts[16])
        population = int(parts[14])
        populations.append(population)
        timezone = parts[17]
        if timezone not in timezones:
            raise RuntimeError('Did not find  timezone "%s" for city: %s' % (timezone, names[0]))
        timezones[timezone].count += 1

        places.append(Place(names, longitude, latitude, elevation, timezone))

maxP = max(populations)
meanP = statistics.mean(populations)
medianP = statistics.median(populations)
modeP = statistics.mode(populations)

countTZ =  [ tz.count for tz in timezones.values()] 
maxTZ = max( countTZ)
meanTZ = statistics.mean(countTZ)
medianTZ = statistics.median(countTZ)
modeTZ = statistics.mode(countTZ)
# factor = int(maxTZ * 0.75)
factor = medianTZ
print('places: %s' % (len(places)))
print('timezones: %s' % (len(timezones)))
print('populations: max: %s, mean: %s, mode %s, median: %s' % (maxP, meanP, modeP, medianP))
print('places per timezone: max: %s, mean: %s, mode %s, median: %s, factor: %s' % (maxTZ, meanTZ, modeTZ, medianTZ, factor))

quadTree = Tree(Box(P(-180,-90), P(180,90)), maxLeafCount=factor, minLeafD=0)

for p in places:
    quadTree.addPlace(p)

stat = quadTree.stats()
maxCnt = max( stat['counts'])
meanCnt = statistics.mean( stat['counts'])
medianCnt = statistics.median( stat['counts'])
modeCnt = statistics.mode( stat['counts'])

maxSz = max( stat['sizes'])
minSz = min( stat['sizes'])
meanSz = statistics.mean( stat['sizes'])
medianSz = statistics.median( stat['sizes'])
modeSz = statistics.mode( stat['sizes'])


print('tree: depth: %s, nodes: %s' % (stat['depth'], stat['nodes']))
print('places per leaf: max: %s, mean: %s, mode %s, median: %s' % (maxCnt, meanCnt, modeCnt, medianCnt))
print('leaf sizes: min: %s, max: %s, mean: %s, mode %s, median: %s' % (minSz, maxSz, meanSz, modeSz, medianSz))
print('maximum timezones per node: %s' % (stat['timezones']))

output = 'export var PlacesTree = '+ quadTree.toJS() + ';'
print('ouput: %s' % len(output))

with open('places.mjs', 'w') as placesFile:
    placesFile.write(output);
    placesFile.write("\n");
 
output = 'export var TimeZonesTree = '+ json.dumps(timezoneTree, indent='  ')+';'

with open('timezones.mjs', 'w') as placesFile:
    placesFile.write(output);
    placesFile.write("\n");





