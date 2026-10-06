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
    private final RoomOccupants occupants;
    private RoomGame game;

    private Room(RoomProfile profile, RoomOccupants occupants) {
        this.profile = profile;
        this.occupants = occupants;
    }

    public static Room open(RoomProfile profile, Participant host) {
        return new Room(profile, RoomOccupants.hostedBy(host, profile.capacity()));
    }

    public void join(Participant participant, String password, RoomPasswordHasher hasher) {
        if (occupants.isPlayer(participant.memberId())) {
            return;
        }
        requireWaiting();
        profile.lock().require(password, hasher);
        occupants.addPlayer(participant, profile.capacity());
    }

    public void watch(Participant participant) {
        if (occupants.isOccupant(participant.memberId())) {
            return;
        }
        if (isLocked()) {
            throw new BusinessException(ErrorCode.ROOM_PRIVATE);
        }
        if (status() != RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.ROOM_NOT_PLAYING);
        }
        occupants.addSpectator(participant);
    }

    public void seat(long memberId) {
        occupants.requireSpectator(memberId);
        requireWaiting();
        occupants.seat(memberId, profile.capacity());
    }

    public List<GameOutcome> leave(long memberId) {
        if (occupants.isSpectator(memberId)) {
            occupants.removeSpectator(memberId);
            return List.of();
        }
        occupants.requirePlayer(memberId);
        List<GameOutcome> outcomes = forfeitIfPlaying(memberId);
        occupants.removePlayer(memberId);
        return outcomes;
    }

    public RoomGame start(long requesterId, Function<List<Long>, GameSession> sessionCreator,
                          String matchKey, Instant startedAt) {
        occupants.requirePlayer(requesterId);
        if (!occupants.isHost(requesterId)) {
            throw new BusinessException(ErrorCode.NOT_ROOM_HOST);
        }
        requireWaiting();
        if (occupants.playerCount() < gameType().minPlayers()) {
            throw new BusinessException(ErrorCode.NOT_ENOUGH_PLAYERS);
        }
        game = new RoomGame(sessionCreator.apply(occupants.playerIds()), matchKey, startedAt);
        return game;
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        occupants.requirePlayer(memberId);
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
        return occupants.spectatorCount();
    }

    public RoomGame currentGame() {
        if (game == null) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        return game;
    }

    public void requireMember(long memberId) {
        occupants.requirePlayer(memberId);
    }

    public void requireOccupant(long memberId) {
        if (!isOccupant(memberId)) {
            throw new BusinessException(ErrorCode.NOT_IN_ROOM);
        }
    }

    public boolean contains(long memberId) {
        return occupants.isPlayer(memberId);
    }

    public boolean isOccupant(long memberId) {
        return occupants.isOccupant(memberId);
    }

    public boolean isEmpty() {
        return occupants.hasNoPlayers();
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
        return occupants.hostId();
    }

    public List<Participant> participants() {
        return occupants.players();
    }

    public List<Participant> spectators() {
        return occupants.spectators();
    }

    public List<Long> memberIds() {
        return occupants.playerIds();
    }

    public List<Long> occupantIds() {
        return occupants.occupantIds();
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
        return occupancy.add(status(), PlayerCount.of(occupants.playerCount()));
    }
}
