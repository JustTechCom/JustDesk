process.env.FRONTEND_URL = 'http://localhost';
const RoomService = require('../room');
const config = require('../../config');

describe('RoomService', () => {
  let redisMock;
  let service;

  beforeEach(() => {
    redisMock = {
      set: jest.fn().mockResolvedValue(null),
      get: jest.fn().mockResolvedValue(null),
      zadd: jest.fn().mockResolvedValue(null),
      expire: jest.fn().mockResolvedValue(null),
      zremrangebyscore: jest.fn().mockResolvedValue(null),
      zrangebyscore: jest.fn().mockResolvedValue([]),
    };
    service = new RoomService(redisMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createRoom stores room in redis', async () => {
    jest.spyOn(service, 'generateRoomId').mockReturnValue(123456789);
    jest.spyOn(service, 'generatePassword').mockReturnValue('ABCDEF');

    const room = await service.createRoom('host1');

    expect(redisMock.set).toHaveBeenCalledTimes(1);
    const [key, value, mode, ttl] = redisMock.set.mock.calls[0];
    expect(key).toBe('room:123456789');
    expect(mode).toBe('PX');
    expect(ttl).toBe(config.room.sessionTimeout);
    const stored = JSON.parse(value);
    expect(stored).toMatchObject({
      roomId: '123456789',
      hostId: 'host1',
      password: 'ABCDEF',
      participants: [],
    });
    expect(room).toMatchObject(stored);
  });

  test('joinRoom adds viewer and logs event', async () => {
    const now = Date.now();
    const roomData = {
      roomId: '1',
      hostId: 'host1',
      password: 'pass',
      participants: [],
      created: now,
      lastActivity: now,
    };
    redisMock.get.mockResolvedValueOnce(JSON.stringify(roomData));
    jest.spyOn(service, 'getRoom').mockResolvedValue({ sharingStartTime: now - 1000 });

    const result = await service.joinRoom('1', 'viewer1', 'Alice');

    expect(result).toEqual({ success: true });
    expect(redisMock.get).toHaveBeenCalledWith('room:1');
    expect(redisMock.set).toHaveBeenCalledTimes(1);
    expect(redisMock.zadd).toHaveBeenCalledTimes(1);
    const [eventsKey, score, eventStr] = redisMock.zadd.mock.calls[0];
    expect(eventsKey).toBe('room:1:events');
    const event = JSON.parse(eventStr);
    expect(event).toMatchObject({ viewerId: 'viewer1', nickname: 'Alice', action: 'join' });
  });

  test('leaveRoom removes viewer and logs event', async () => {
    const now = Date.now();
    const roomData = {
      roomId: '1',
      hostId: 'host1',
      password: 'pass',
      participants: [{ id: 'viewer1', name: 'Alice' }],
      created: now,
      lastActivity: now,
    };
    redisMock.get.mockResolvedValueOnce(JSON.stringify(roomData));
    jest.spyOn(service, 'getRoom').mockResolvedValue({ sharingStartTime: now - 1000 });

    await service.leaveRoom('1', 'viewer1', 'Alice');

    expect(redisMock.get).toHaveBeenCalledWith('room:1');
    expect(redisMock.set).toHaveBeenCalledTimes(1);
    expect(redisMock.zadd).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(redisMock.set.mock.calls[0][1]);
    expect(stored.participants).toHaveLength(0);
    const event = JSON.parse(redisMock.zadd.mock.calls[0][2]);
    expect(event).toMatchObject({ viewerId: 'viewer1', nickname: 'Alice', action: 'leave' });
  });

  test('getViewerStats processes events', async () => {
    const sharingStartTime = Date.now() - 5000;
    jest.spyOn(service, 'getRoom').mockResolvedValue({ sharingStartTime });
    const events = [
      JSON.stringify({ viewerId: '1', nickname: 'Alice', timestamp: sharingStartTime + 1000, action: 'join' }),
      JSON.stringify({ viewerId: '1', nickname: 'Alice', timestamp: sharingStartTime + 2000, action: 'leave' }),
    ];
    redisMock.zrangebyscore.mockResolvedValue(events);

    const stats = await service.getViewerStats('1');

    expect(redisMock.zrangebyscore).toHaveBeenCalledWith(
      'room:1:events',
      sharingStartTime,
      sharingStartTime + 60 * 60 * 1000
    );
    expect(stats).toHaveLength(3);
    expect(stats[1]).toMatchObject({ count: 1 });
    expect(stats[2]).toMatchObject({ count: 0 });
  });
});
