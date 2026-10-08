package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;

// 한 판의 애그리거트. 모든 규칙 메서드가 여기에 있다(Task 3~6이 더한다).
public class UnoRound {

    static final int NEXT = 1;
    static final int SKIP_ONE = 2;
    private static final int DRAW_TWO_COUNT = 2;
    private static final int TWO_PLAYERS = 2;
    private static final int FOUR = 4;
    private static final int UNO_PENALTY = 2;

    private final UnoTable table;
    private final UnoPlayers players;
    private final UnoProgress progress;

    UnoRound(UnoTable table, UnoPlayers players, UnoProgress progress) {
        this.table = table;
        this.players = players;
        this.progress = progress;
    }

    // R7: 첫 카드 효과를 적용하고, 효과 이벤트 뒤에 START(첫 차례 사람, 첫 카드)를 남긴다.
    void openWith(UnoCard first, EventBatch events) {
        switch (first.kind()) {
            case SKIP -> skipStarter(events);
            case REVERSE -> reverseAtStart(events);
            case DRAW_TWO -> drawTwoAtStart(events);
            case WILD -> progress.begin(Turn.chooseColor(players.current()));
            case NUMBER -> progress.begin(Turn.play(players.current()));
            case WILD_DRAW_FOUR -> throw new IllegalStateException("WILD_DRAW_FOUR는 첫 카드가 될 수 없다");
        }
        events.add(UnoEvent.start(players.current(), first));
    }

    private void skipStarter(EventBatch events) {
        events.add(UnoEvent.skip(players.current()));
        passTurn(NEXT);
    }

    // 3명 이상이면 반대 방향으로 딜러(starter 바로 앞 사람)부터. 2명이면 starter가 차례를 잃는 것과 같다.
    private void reverseAtStart(EventBatch events) {
        if (players.size() == TWO_PLAYERS) {
            skipStarter(events);
            return;
        }
        players.reverse();
        events.add(UnoEvent.reverse(null));
        passTurn(NEXT);
    }

    private void drawTwoAtStart(EventBatch events) {
        penalize(players.current(), DRAW_TWO_COUNT, UnoEventReason.DRAW_TWO, events);
        passTurn(NEXT);
    }

    // 벌칙으로 뽑게 한다. 더미가 모자라면 실제로 뽑은 장수만 기록한다(R14).
    void penalize(PlayerId target, int count, UnoEventReason reason, EventBatch events) {
        List<UnoCard> drawn = table.draw(count, events);
        players.give(target, drawn);
        events.add(UnoEvent.penalty(target, drawn.size(), reason));
    }

    // 차례를 넘긴다. steps 1 = 다음 사람, 2 = 한 사람 건너뜀. 같은 사람이 다시 해도 새 단계(새 순번)다.
    void passTurn(int steps) {
        players.endTurn();
        players.advance(steps);
        progress.begin(Turn.play(players.current()));
    }

    // R8~R10
    public void play(PlayerId player, CardId cardId, ChosenColor chosen, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.PLAY, UnoStage.DRAWN);
        UnoCard card = players.cardOf(player, cardId);
        progress.requireDrawnOrAny(cardId);
        requirePlayable(card);
        UnoColor color = colorFor(card, chosen);
        players.closeCatch();
        players.discardFrom(player, cardId);
        table.discard(card, color);
        events.add(UnoEvent.play(player, card, chosenColorOf(card, color)));
        players.settleUno(player);
        if (players.isOut(player)) {
            applyLastCard(card, events);
            return;
        }
        resolve(player, card, events);
    }

    private void requirePlayable(UnoCard card) {
        if (!table.accepts(card)) {
            throw new BusinessException(ErrorCode.UNO_CARD_NOT_PLAYABLE);
        }
    }

    // R10: 와일드는 같은 행동에 실린 색이 필수, 그 밖에는 카드 색.
    private UnoColor colorFor(UnoCard card, ChosenColor chosen) {
        if (card.isWild()) {
            return chosen.require();
        }
        return card.color();
    }

    private UnoColor chosenColorOf(UnoCard card, UnoColor color) {
        if (card.isWild()) {
            return color;
        }
        return null;
    }

    // R15~R18
    void resolve(PlayerId player, UnoCard card, EventBatch events) {
        switch (card.kind()) {
            case SKIP -> skipNext(events);
            case REVERSE -> reverse(player, events);
            case DRAW_TWO -> drawTwoNext(events);
            case WILD_DRAW_FOUR -> drawFourNext(events);
            case NUMBER, WILD -> passTurn(NEXT);
        }
    }

    // R23·R27: 내 차례(PLAY/DRAWN)에 2장이면 외친다. 잡기 창의 대상 본인이면 언제든 늦게 외쳐 선언된다.
    public void callUno(PlayerId player, EventBatch events) {
        if (players.isCatchable(player)) {
            players.declareLate(player);
            events.add(UnoEvent.unoCall(player));
            return;
        }
        progress.requireActor(player);
        progress.requireStage(UnoStage.PLAY, UnoStage.DRAWN);
        requireCallable(player);
        players.call(player);
        events.add(UnoEvent.unoCall(player));
    }

    private void requireCallable(PlayerId player) {
        if (!players.canCall(player)) {
            throw new BusinessException(ErrorCode.UNO_CALL_NOT_ALLOWED);
        }
    }

    // R26: 창이 열려 있고 대상이 맞고 본인이 아니면, 먼저 도착한 한 명만 성공한다. 차례·마감에는 영향이 없다.
    public void catchUno(PlayerId catcher, PlayerId target, EventBatch events) {
        if (!players.isCatchable(target) || catcher.equals(target)) {
            throw new BusinessException(ErrorCode.UNO_CATCH_CLOSED);
        }
        players.closeCatch();
        events.add(UnoEvent.unoCaught(catcher, target));
        penalize(target, UNO_PENALTY, UnoEventReason.UNO_CAUGHT, events);
    }

    public boolean canCallUno(PlayerId viewer) {
        if (players.isCatchable(viewer)) {
            return true;
        }
        return progress.isActorIn(viewer, UnoStage.PLAY, UnoStage.DRAWN) && players.canCall(viewer);
    }

    public boolean canCatch(PlayerId viewer) {
        return players.contains(viewer) && players.catchTarget()
                .filter(target -> !target.equals(viewer))
                .isPresent();
    }

    private void skipNext(EventBatch events) {
        events.add(UnoEvent.skip(players.nextOf(players.current())));
        passTurn(SKIP_ONE);
    }

    // R16: 2명이면 건너뛰기와 같다(방향 값은 그대로).
    private void reverse(PlayerId player, EventBatch events) {
        if (players.size() == TWO_PLAYERS) {
            skipNext(events);
            return;
        }
        players.reverse();
        events.add(UnoEvent.reverse(player));
        passTurn(NEXT);
    }

    private void drawTwoNext(EventBatch events) {
        penalize(players.nextOf(players.current()), DRAW_TWO_COUNT, UnoEventReason.DRAW_TWO, events);
        passTurn(SKIP_ONE);
    }

    // R18: 다음 사람이 4장을 뽑고 차례를 잃는다(도전 없음, 언제든 낼 수 있다).
    private void drawFourNext(EventBatch events) {
        penalize(players.nextOf(players.current()), FOUR, UnoEventReason.WILD_DRAW_FOUR, events);
        passTurn(SKIP_ONE);
    }

    // R12·R14
    public void draw(PlayerId player, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.PLAY);
        players.closeCatch();
        List<UnoCard> drawn = table.draw(1, events);
        if (drawn.isEmpty()) {
            events.add(UnoEvent.pass(player, UnoEventReason.EMPTY_PILE));
            passTurn(NEXT);
            return;
        }
        players.give(player, drawn);
        events.add(UnoEvent.draw(player));
        offerDrawn(player, drawn.get(0), events);
    }

    private void offerDrawn(PlayerId player, UnoCard card, EventBatch events) {
        if (table.accepts(card)) {
            progress.begin(Turn.drawn(player, card.id()));
            return;
        }
        events.add(UnoEvent.pass(player, UnoEventReason.NO_PLAYABLE));
        passTurn(NEXT);
    }

    // R12: 뽑은 카드를 갖고 넘긴다.
    public void keep(PlayerId player, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.DRAWN);
        players.closeCatch();
        events.add(UnoEvent.pass(player, UnoEventReason.KEEP));
        passTurn(NEXT);
    }

    // R29·R30: 마지막 카드의 뽑기 효과만 적용하고 끝낸다(SKIP·REVERSE·WILD는 효과 없음). 마지막 +4도 4장.
    private void applyLastCard(UnoCard card, EventBatch events) {
        players.endTurn();
        PlayerId next = players.nextOf(players.current());
        if (card.kind() == CardKind.DRAW_TWO) {
            penalize(next, DRAW_TWO_COUNT, UnoEventReason.DRAW_TWO, events);
        }
        if (card.kind() == CardKind.WILD_DRAW_FOUR) {
            penalize(next, FOUR, UnoEventReason.WILD_DRAW_FOUR, events);
        }
    }

    // R7: 첫 카드 WILD의 색을 고르면 같은 사람이 이어서 PLAY(새 단계).
    public void chooseColor(PlayerId player, ChosenColor chosen, EventBatch events) {
        progress.requireActor(player);
        progress.requireStage(UnoStage.CHOOSE_COLOR);
        UnoColor color = chosen.require();
        players.closeCatch();
        table.paint(color);
        events.add(UnoEvent.color(player, color));
        progress.begin(Turn.play(player));
    }

    // R35~R39
    public void forfeit(PlayerId player, EventBatch events) {
        boolean acting = progress.isActor(player);
        paintIfChoosing(player, acting, events);
        Hand hand = players.remove(player);
        table.bury(hand.cards());
        afterLeaving(acting);
    }

    // R36: 첫 카드 WILD 색 고르기 중이었다면 기권자의 손패로 자동 색(R40)을 먼저 정한다.
    private void paintIfChoosing(PlayerId player, boolean acting, EventBatch events) {
        if (!acting || !progress.is(UnoStage.CHOOSE_COLOR)) {
            return;
        }
        UnoColor color = players.mostHeldColor(player);
        table.paint(color);
        events.add(UnoEvent.color(player, color));
    }

    // R36·R39
    private void afterLeaving(boolean acting) {
        if (!acting) {
            return;
        }
        players.endTurn();
        progress.begin(Turn.play(players.current()));
    }

    // R40: 지금 단계의 행동을 대신 한다. 우노 외치기·잡기는 하지 않는다.
    public void autoAct(EventBatch events) {
        PlayerId actor = progress.actor();
        switch (progress.stage()) {
            case PLAY -> drawAndKeep(actor, events);
            case DRAWN -> keep(actor, events);
            case CHOOSE_COLOR -> chooseColor(actor, ChosenColor.of(players.mostHeldColor(actor)), events);
        }
    }

    // D16: 낼 수 있어도 내지 않고 갖고 넘긴다.
    private void drawAndKeep(PlayerId actor, EventBatch events) {
        draw(actor, events);
        if (progress.isActorIn(actor, UnoStage.DRAWN)) {
            keep(actor, events);
        }
    }

    public Optional<PlayerId> winnerByEmptyHand() {
        return players.seats()
                .stream()
                .filter(players::isOut)
                .findFirst();
    }

    public UnoPoints pointsExcept(PlayerId winner) {
        return players.pointsExcept(winner);
    }

    public UnoPoints pointsOf(PlayerId player) {
        return players.pointsOf(player);
    }

    public int remainingCount() {
        return players.size();
    }

    void closeCatch() {
        players.closeCatch();
    }

    public PlayerId actor() {
        return progress.actor();
    }

    public UnoStage stage() {
        return progress.stage();
    }

    public StageSeq stageSeq() {
        return progress.seq();
    }

    public Direction direction() {
        return players.direction();
    }

    public Optional<UnoColor> currentColor() {
        return table.color();
    }

    public UnoCard discardTop() {
        return table.top();
    }

    public int discardSize() {
        return table.discardSize();
    }

    public int drawPileSize() {
        return table.drawPileSize();
    }

    public List<UnoCard> handOf(PlayerId player) {
        return players.cardsOf(player);
    }

    public int cardCount(PlayerId player) {
        return players.countOf(player);
    }

    public List<PlayerId> remaining() {
        return players.seats();
    }

    public boolean isRemaining(PlayerId player) {
        return players.contains(player);
    }

    public boolean isDeclared(PlayerId player) {
        return players.isDeclared(player);
    }

    public Optional<PlayerId> catchTarget() {
        return players.catchTarget();
    }

    // D19: 보는 사람이 지금 낼 수 있는 카드. PLAY면 R8, DRAWN이면 뽑은 카드만, 그 밖·남의 차례는 없음. +4는 언제든 들어간다(R11).
    public List<CardId> playableFor(PlayerId viewer) {
        if (progress.isActorIn(viewer, UnoStage.DRAWN)) {
            return progress.drawnCard().stream().toList();
        }
        if (!progress.isActorIn(viewer, UnoStage.PLAY)) {
            return List.of();
        }
        return players.playable(viewer, table.top(), table.color().orElse(null));
    }

    public Optional<CardId> drawnFor(PlayerId viewer) {
        if (!progress.isActorIn(viewer, UnoStage.DRAWN)) {
            return Optional.empty();
        }
        return progress.drawnCard();
    }
}
