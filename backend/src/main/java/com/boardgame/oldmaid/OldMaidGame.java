package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;

// 한 게임(= 한 판).
public class OldMaidGame {

    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 6;

    private final OldMaidRound round;
    private final OldMaidEvents events;
    private OldMaidResult result;

    private OldMaidGame(OldMaidRound round, OldMaidEvents events) {
        this.round = round;
        this.events = events;
    }

    public static OldMaidGame start(List<PlayerId> players, OldMaidRoundFactory factory) {
        requirePlayerCount(players);
        return opened(batch -> factory.create(players, batch));
    }

    // 테스트: 손패를 정해 둔 나눔으로 시작한다.
    static OldMaidGame begin(List<PlayerId> players, Deal deal, OldMaidDice dice) {
        return opened(batch -> OldMaidRound.begin(new Seats(players), deal, dice, batch));
    }

    // 판을 여는 행동도 이벤트 묶음 하나로 기록한다.
    private static OldMaidGame opened(Function<EventBatch, OldMaidRound> open) {
        OldMaidEvents events = new OldMaidEvents();
        EventBatch batch = events.open(false);
        OldMaidRound round = open.apply(batch);
        events.commit(batch);
        return new OldMaidGame(round, events);
    }

    private static void requirePlayerCount(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.OLD_MAID_INVALID_PLAYER_COUNT);
        }
    }

    public void draw(PlayerId player, SlotIndex slot) {
        run(player, OldMaidEndReason.NORMAL, batch -> round.draw(player, slot, batch));
    }

    // 끝나면 최종 등수(도둑·기권자 포함), 게임 중이면 손패를 비운 사람의 등수만.
    public Optional<FinishRank> rankOf(PlayerId player) {
        if (result != null) {
            return Optional.of(result.rankOf(player));
        }
        return round.finishRankOf(player);
    }

    // 사람이 한 행동: 끝난 게임이 아닌지, 기권하지 않은 참가자인지 본 뒤 상태를 바꾼다.
    // 참가자 검사가 자리 찾기보다 먼저라 자리에 없는 사람이 Seats까지 가지 않는다.
    void run(PlayerId player, OldMaidEndReason reason, Consumer<EventBatch> action) {
        requireInProgress();
        requireParticipant(player);
        apply(false, reason, action);
    }

    // 이벤트를 모아 성공했을 때만 기록을 바꾼다. 실패하면 예외가 commit 전에 나가 이전 기록이 남는다.
    void apply(boolean auto, OldMaidEndReason reason, Consumer<EventBatch> action) {
        EventBatch batch = events.open(auto);
        action.accept(batch);
        settle(reason, batch);
        events.commit(batch);
    }

    void requireInProgress() {
        if (isFinished()) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }

    private void requireParticipant(PlayerId player) {
        if (!round.isParticipant(player)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
    }

    // R16·R29: 카드 가진 사람이 1명이면 끝낸다. 끝나는 행동에서 딱 한 번만 정산된다.
    private void settle(OldMaidEndReason reason, EventBatch batch) {
        if (round.holderCount() > 1) {
            return;
        }
        result = new OldMaidResult(reason, round.ranking());
        batch.add(result.toEvent());
    }

    public boolean isFinished() {
        return result != null;
    }

    public Optional<OldMaidResult> result() {
        return Optional.ofNullable(result);
    }

    public PlayerId drawer() {
        return round.drawer();
    }

    public PlayerId target() {
        return round.target();
    }

    public TurnSeq turnSeq() {
        return round.turnSeq();
    }

    public List<PlayerId> seats() {
        return round.seats();
    }

    public List<PlayingCard> handOf(PlayerId player) {
        return round.handOf(player);
    }

    public int cardCount(PlayerId player) {
        return round.cardCount(player);
    }

    public boolean holds(PlayerId player) {
        return round.holds(player);
    }

    public boolean isParticipant(PlayerId player) {
        return round.isParticipant(player);
    }

    public boolean hasForfeited(PlayerId player) {
        return round.hasForfeited(player);
    }

    public Optional<FinishRank> finishRankOf(PlayerId player) {
        return round.finishRankOf(player);
    }

    public int discardCount() {
        return round.discardCount();
    }

    public List<CardPair> recentPairs(int limit) {
        return round.recentPairs(limit);
    }

    public List<OldMaidEvent> latestEvents() {
        return events.latest();
    }
}
