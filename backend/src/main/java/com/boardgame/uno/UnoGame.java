package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;

// 한 게임(= 한 판). 행동은 Task 3~6이 더한다.
public class UnoGame {

    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 5;

    private final UnoRound round;
    private final UnoEvents events;

    private UnoGame(UnoRound round, UnoEvents events) {
        this.round = round;
        this.events = events;
    }

    public static UnoGame start(List<PlayerId> players, UnoRoundFactory factory) {
        requirePlayerCount(players);
        UnoEvents events = new UnoEvents();
        EventBatch batch = events.open(false);
        UnoRound round = factory.create(players, batch);
        events.commit(batch);
        return new UnoGame(round, events);
    }

    private static void requirePlayerCount(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.UNO_INVALID_PLAYER_COUNT);
        }
    }

    public PlayerId actor() {
        return round.actor();
    }

    public UnoStage stage() {
        return round.stage();
    }

    public StageSeq stageSeq() {
        return round.stageSeq();
    }

    public Direction direction() {
        return round.direction();
    }

    public Optional<UnoColor> currentColor() {
        return round.currentColor();
    }

    public UnoCard discardTop() {
        return round.discardTop();
    }

    public int discardSize() {
        return round.discardSize();
    }

    public int drawPileSize() {
        return round.drawPileSize();
    }

    public List<UnoCard> handOf(PlayerId player) {
        return round.handOf(player);
    }

    public int cardCount(PlayerId player) {
        return round.cardCount(player);
    }

    public List<PlayerId> remaining() {
        return round.remaining();
    }

    public boolean isRemaining(PlayerId player) {
        return round.isRemaining(player);
    }

    public boolean isDeclared(PlayerId player) {
        return round.isDeclared(player);
    }

    public Optional<PlayerId> catchTarget() {
        return round.catchTarget();
    }

    public List<UnoEvent> latestEvents() {
        return events.latest();
    }
}
