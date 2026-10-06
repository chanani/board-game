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
import java.util.Random;
import java.util.function.Function;

public class Room {

    private RoomProfile profile;
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
        RoomLock lock = lockToPass(participant.memberId());
        lock.require(password, hasher);
        admit(participant, lock);
    }

    /** 들어오려는 사람이 통과해야 할 잠금. 이미 참가자면 확인할 것이 없다. 느린 비밀번호 확인은 호출자가 잠금 밖에서 한다. */
    public RoomLock lockToPass(long memberId) {
        if (occupants.isPlayer(memberId)) {
            return RoomLock.open();
        }
        requireWaiting();
        return profile.lock();
    }

    /** lockToPass로 받은 잠금을 통과한 사람을 들인다. 그사이 잠금이 달라졌으면 들이지 않는다. */
    public void admit(Participant participant, RoomLock passed) {
        if (occupants.isPlayer(participant.memberId())) {
            return;
        }
        requireWaiting();
        if (!profile.lock().equals(passed)) {
            throw new BusinessException(ErrorCode.ROOM_PASSWORD_MISMATCH);
        }
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

    public void setReady(long memberId, boolean ready) {
        occupants.requirePlayer(memberId);
        requireWaiting();
        if (occupants.isHost(memberId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        occupants.setReady(memberId, ready);
    }

    public List<GameOutcome> leave(long memberId) {
        if (occupants.isSpectator(memberId)) {
            occupants.removeSpectator(memberId);
            return List.of();
        }
        occupants.requirePlayer(memberId);
        boolean wasPlaying = status() == RoomStatus.PLAYING;
        List<GameOutcome> outcomes = forfeitIfPlaying(memberId);
        occupants.removePlayer(memberId);
        settleIfJustFinished(wasPlaying);
        return outcomes;
    }

    /** 대기 중에 방장이 다른 참가자를 내보낸다. 준비하지 않고 자리만 지키는 사람 때문에 방이 막히지 않게 한다. */
    public void kick(long requesterId, long targetId) {
        requireHost(requesterId);
        requireWaiting();
        occupants.requirePlayer(targetId);
        if (occupants.isHost(targetId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        occupants.removePlayer(targetId);
    }

    /** 대기 중에 방장이 최대 인원과 테마를 바꾼다. 비밀번호와 이름, 준비 상태는 그대로 둔다. */
    public void reconfigure(long requesterId, Capacity capacity, RoomTheme theme) {
        requireHost(requesterId);
        requireWaiting();
        if (capacity.isBelow(occupants.playerCount())) {
            throw new BusinessException(ErrorCode.CAPACITY_BELOW_PLAYERS);
        }
        profile = profile.reconfigured(capacity, theme);
        occupants.seatWaitingSpectators(capacity);
    }

    public RoomGame start(long requesterId, Function<List<Long>, GameSession> sessionCreator,
                          String matchKey, Instant startedAt) {
        requireHost(requesterId);
        requireWaiting();
        if (occupants.playerCount() < gameType().minPlayers()) {
            throw new BusinessException(ErrorCode.NOT_ENOUGH_PLAYERS);
        }
        if (!occupants.everyGuestReady()) {
            throw new BusinessException(ErrorCode.PLAYERS_NOT_READY);
        }
        occupants.clearReady();
        game = new RoomGame(sessionCreator.apply(occupants.playerIds()), matchKey, startedAt);
        return game;
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        occupants.requirePlayer(memberId);
        if (status() != RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        List<GameOutcome> outcomes = game.act(memberId, action);
        settleIfJustFinished(true);
        return outcomes;
    }

    /** 시간 초과로 서버가 대신 행동한다. 게임이 그 행동으로 끝나면 직접 행동했을 때처럼 정리한다. */
    public List<GameOutcome> autoAct(Random random) {
        if (status() != RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        List<GameOutcome> outcomes = game.autoAct(random);
        settleIfJustFinished(true);
        return outcomes;
    }

    /** 진행 중인 게임이 행동을 기다리는 마감. 진행 중이 아니면 비어 있다. */
    public Optional<Instant> deadline() {
        if (status() != RoomStatus.PLAYING) {
            return Optional.empty();
        }
        return game.deadline();
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

    public boolean isGameInProgress() {
        return status() == RoomStatus.PLAYING;
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

    public boolean isSpectator(long memberId) {
        return occupants.isSpectator(memberId);
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

    public RoomTheme theme() {
        return profile.theme();
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

    public List<Long> readyIds() {
        return occupants.readyIds();
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

    /** 게임이 방금 끝났으면 준비를 풀고, 기다리던 관전자를 정원까지 참가자로 옮긴다. */
    private void settleIfJustFinished(boolean wasPlaying) {
        if (!wasPlaying || status() == RoomStatus.PLAYING) {
            return;
        }
        occupants.clearReady();
        occupants.seatWaitingSpectators(profile.capacity());
    }

    private void requireHost(long memberId) {
        occupants.requirePlayer(memberId);
        if (!occupants.isHost(memberId)) {
            throw new BusinessException(ErrorCode.NOT_ROOM_HOST);
        }
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
