'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Ride=require('./ride-hail.js');
test('City Ride keeps exact pickup and landmark dropoff, charges 6 stars, and times rides by distance',()=>{
    const pickup={quadrant:'NW',x:800,y:800},near={quadrant:'NW',x:1000,y:900},far={quadrant:'SE',x:1000,y:900};
    assert.equal(Ride.quote(pickup,near).fare,6);
    assert.equal(Ride.quote(pickup,far).fare,6);
    assert.ok(Ride.quote(pickup,far).duration>Ride.quote(pickup,near).duration);
    assert.throws(()=>Ride.start(pickup,near,'Library',5,1000),/Not enough/);
    assert.throws(()=>Ride.quote(pickup,pickup),/already/);
    assert.throws(()=>Ride.quote({quadrant:'NW',x:Infinity,y:0},near),/Invalid/);
    const trip=Ride.start(pickup,far,'SE Public Library',6,1000);
    assert.deepEqual(trip.pickup,pickup);
    assert.deepEqual(trip.dropoff,far);
    assert.ok(Ride.valid(JSON.parse(JSON.stringify(trip))));
    assert.equal(Ride.position(trip,1000+Ride.quote(pickup,far).duration),1);
    assert.equal(Ride.position(trip,0),0);
});
