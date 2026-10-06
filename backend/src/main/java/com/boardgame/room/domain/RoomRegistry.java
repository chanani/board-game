package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class RoomRegistry {

    private final Map<RoomCode, Room> rooms = new ConcurrentHashMap<>();
    private final Map<Long, RoomCode> memberRooms = new ConcurrentHashMap<>();

    public void save(Room room) {
        RoomCode code = room.code();
        memberRooms.entrySet().removeIf(entry -> entry.getValue().equals(code) && !room.isOccupant(entry.getKey()));
        room.occupantIds().forEach(memberId -> memberRooms.put(memberId, code));
        rooms.put(code, room);
        removeIfEmpty(room);
    }

    public Room get(RoomCode code) {
        Room room = rooms.get(code);
        if (room == null) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room;
    }

    public Optional<Room> find(RoomCode code) {
        return Optional.ofNullable(rooms.get(code));
    }

    public Optional<Room> findByMember(long memberId) {
        return Optional.ofNullable(memberRooms.get(memberId)).map(rooms::get);
    }

    public List<Room> all() {
        return rooms.values().stream()
                .sorted(Comparator.comparing(Room::codeValue))
                .toList();
    }

    public boolean exists(RoomCode code) {
        return rooms.containsKey(code);
    }

    private void removeIfEmpty(Room room) {
        if (!room.isEmpty()) {
            return;
        }
        rooms.remove(room.code());
        room.occupantIds().forEach(memberId -> memberRooms.remove(memberId, room.code()));
    }
}
