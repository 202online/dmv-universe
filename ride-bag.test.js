'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Bag=require('./ride-bag.js');
test('only owned non-active cars can be persisted outside the portable ride bag',()=>{
    assert.deepEqual(Bag.portable,['bike','scooter','ebike']);
    assert.ok(Bag.validParked({impala:{quadrant:'NW',x:800,y:800}},['bike','impala'],'bike',1600));
    for(const value of [null,[],{bike:{quadrant:'NW',x:800,y:800}},{impala:{quadrant:'NW',x:Infinity,y:800}},
        {impala:{quadrant:'XX',x:800,y:800}},{impala:{quadrant:'NW',x:4000,y:800}}])
        assert.equal(Bag.validParked(value,['bike','impala'],'bike',1600),false);
    assert.equal(Bag.validParked({impala:{quadrant:'NW',x:800,y:800}},['bike'],'bike',1600),false);
    assert.equal(Bag.validParked({impala:{quadrant:'NW',x:800,y:800}},['bike','impala'],'impala',1600),false);
    assert.ok(Bag.validParked({impala:{quadrant:'SE',x:800,y:800,heading:[Math.SQRT1_2,-Math.SQRT1_2]}},['bike','impala'],'bike',1600));
    for(const heading of [[],[0,0],[1,1],[NaN,0],'east'])
        assert.equal(Bag.validParked({impala:{quadrant:'SE',x:800,y:800,heading}},['bike','impala'],'bike',1600),false);
});
test('unattended parking waits a full minute and resets when the player returns',()=>{
    assert.deepEqual(Bag.abandonment(60,null,1000),{since:1000,secure:false});
    assert.deepEqual(Bag.abandonment(100,1000,60999),{since:1000,secure:false});
    assert.deepEqual(Bag.abandonment(100,1000,61000),{since:1000,secure:true});
    assert.deepEqual(Bag.abandonment(59,1000,61000),{since:null,secure:false});
    assert.deepEqual(Bag.abandonment(Number.MAX_SAFE_INTEGER,1000,61000),{since:1000,secure:true});
    assert.throws(()=>Bag.abandonment(NaN,null,1000));
});
