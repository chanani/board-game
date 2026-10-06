package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

public class Room {

    private final RoomProfile profile;
    private final RoomMembers members;
    private RoomGame game;

    private Room(RoomProfile profile, RoomMembers members) {
        this.profile = profile;
        this.members = members;
    }

    public static Room open(RoomProfile profile, Participant host) {
        RoomMembers members = new RoomMembers();
        members.add(host, profile.capacity());
        return new Room(profile, members);
    }

    public void join(Participant participant, String password, RoomPasswordHasher hasher) {
        if (members.contains(participant.memberId())) {
            return;
        }
        requireWaiting();
        profile.lock().require(password, hasher);
        members.add(participant, profile.capacity());
    }

    public List<GameOutcome> leave(long memberId) {
        members.requireMember(memberId);
        List<GameOutcome> outcomes = forfeitIfPlaying(memberId);
        members.remove(memberId);
        return outcomes;
    }

    public RoomGame start(long requesterId, Function<List<Long>, GameSession> sessionCreator,
                          String matchKey, Instant startedAt) {
        members.requireMember(requesterId);
        if (!members.isHost(requesterId)) {
            throw new BusinessException(ErrorCode.NOT_ROOM_HOST);
        }
        requireWaiting();
        if (members.size() < gameType().minPlayers()) {
            throw new BusinessException(ErrorCode.NOT_ENOUGH_PLAYERS);
        }
        game = new RoomGame(sessionCreator.apply(members.ids()), matchKey, startedAt);
        return game;
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        members.requireMember(memberId);
        if (status() != RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        return game.act(memberId, action);
    }

    public Optional<Object> viewFor(long memberId) {
        if (game == null) {
            return Optional.empty();
        }
        return Optional.of(game.viewFor(memberId));
    }

    public RoomStatus status() {
        if (game == null || game.isFinished()) {
            return RoomStatus.WAITING;
        }
        return RoomStatus.PLAYING;
    }

    public boolean isPlaying(long memberId) {
        return status() == RoomStatus.PLAYING && game.isPlaying(memberId);
    }

    public boolean isFor(GameType type) {
        return type == null || type == gameType();
    }

    public Optional<Integer> roundNumber() {
        if (status() != RoomStatus.PLAYING) {
            return Optional.empty();
        }
        return Optional.of(game.roundNumber());
    }

    public int spectatorCount() {
        return 0;
    }

    public RoomGame currentGame() {
        if (game == null) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        return game;
    }

    public void requireMember(long memberId) {
        members.requireMember(memberId);
    }

    public boolean contains(long memberId) {
        return members.contains(memberId);
    }

    public boolean isEmpty() {
        return members.isEmpty();
    }

    public RoomCode code() {
        return profile.code();
    }

    public String codeValue() {
        return code().value();
    }

    public String nameValue() {
        RoomName name = profile.name();
        return name.value();
    }

    public int capacity() {
        return profile.capacity().value();
    }

    public boolean isLocked() {
        return profile.lock().isLocked();
    }

    public GameType gameType() {
        return profile.gameType();
    }

    public long hostId() {
        return members.hostId();
    }

    public List<Participant> participants() {
        return members.asList();
    }

    public List<Long> memberIds() {
        return members.ids();
    }

    private List<GameOutcome> forfeitIfPlaying(long memberId) {
        if (!isPlaying(memberId)) {
            return List.of();
        }
        return game.forfeit(memberId);
    }

    private void requireWaiting() {
        if (status() == RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.ROOM_ALREADY_PLAYING);
        }
    }

    public GameOccupancy addTo(GameOccupancy occupancy) {
        return occupancy.add(status(), PlayerCount.of(members.size()));
    }
}
