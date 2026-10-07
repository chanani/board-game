package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;

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
        OldMaidEvents events = new OldMaidEvents();
        EventBatch batch = events.open(false);
        OldMaidRound round = factory.create(players, batch);
        events.commit(batch);
        return new OldMaidGame(round, events);
    }

    // 테스트: 손패를 정해 둔 나눔으로 시작한다.
    static OldMaidGame begin(List<PlayerId> players, Deal deal, OldMaidDice dice) {
        OldMaidEvents events = new OldMaidEvents();
        EventBatch batch = events.open(false);
        OldMaidRound round = OldMaidRound.begin(new Seats(players), deal, dice, batch);
        events.commit(batch);
        return new OldMaidGame(round, events);
    }

    private static void requirePlayerCount(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.OLD_MAID_INVALID_PLAYER_COUNT);
        }
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
