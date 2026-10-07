package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 한 판의 애그리거트. 처음 버리기 단계와 차례 규칙은 모두 여기 있다.
public class OldMaidRound {

    private final OldMaidTable table;
    private final OldMaidPlayers players;
    private final TurnState turns;

    private OldMaidRound(OldMaidTable table, OldMaidPlayers players, TurnState turns) {
        this.table = table;
        this.players = players;
        this.turns = turns;
    }

    // R5·R36: 나눈 그대로 처음 버리기 단계로 시작한다. 짝이 하나도 없으면 곧바로 첫 차례로 간다.
    static OldMaidRound begin(Seats seats, Deal deal, OldMaidDice dice, EventBatch batch) {
        OldMaidTable table = new OldMaidTable(deal.hands(), new DiscardPile(), dice);
        OldMaidRound round = new OldMaidRound(table, new OldMaidPlayers(seats, deal.first()), new TurnState());
        batch.add(OldMaidEvent.deal(deal.first()));
        round.closeOpeningIfDone(batch);
        return round;
    }

    // R36: 처음 버리기 단계에는 모두가 동시에, R37: 게임 중에는 뽑은 카드로 짝이 된 뽑은 사람만 고른 두 장을 버린다.
    void discard(PlayerId player, PairChoice choice, EventBatch batch) {
        if (turns.isOpening()) {
            discardChosen(player, choice, batch);
            closeOpeningIfDone(batch);
            return;
        }
        turns.requireDiscarder(player);
        discardChosen(player, choice, batch);
        finishIfEmpty(player, batch);
        passAfterDiscard(player);
    }

    // R39: 내 짝을 한 번에 모두 버린다. 처음 버리기 단계면 내 손의 짝 모두(짝이 없으면 INVALID_PHASE),
    // 짝 버리기 단계면 뽑은 사람만 그 짝을(R37과 같은 검사). 시간 초과 자동 버림(R38)과 같은 R6 방식이고 auto는 아니다.
    void discardAllMine(PlayerId player, EventBatch batch) {
        if (turns.isOpening()) {
            requirePair(player);
            discardAll(player, batch);
            closeOpeningIfDone(batch);
            return;
        }
        turns.requireDiscarder(player);
        discardDrawnPair(player, batch);
    }

    private void requirePair(PlayerId player) {
        if (!table.hasPair(player)) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
    }

    // R37·R38: 뽑은 사람의 짝을 버리고, 손이 비면 끝낸 뒤, 짝이 남지 않았으면 차례를 넘긴다.
    private void discardDrawnPair(PlayerId drawer, EventBatch batch) {
        discardAll(drawer, batch);
        finishIfEmpty(drawer, batch);
        passAfterDiscard(drawer);
    }

    private void discardChosen(PlayerId player, PairChoice choice, EventBatch batch) {
        CardPair pair = table.discardChosen(player, choice);
        batch.add(OldMaidEvent.pair(player, pair));
    }

    private void discardAll(PlayerId player, EventBatch batch) {
        table.discardAllPairs(player)
                .forEach(pair -> batch.add(OldMaidEvent.pair(player, pair)));
    }

    // R36: 아무 손에도 짝이 없거나(기권으로) 카드를 가진 사람이 2명보다 적으면 처음 버리기를 끝낸다.
    // R8: 빈 손은 첫 사람부터 시계 방향 순서로 등수를 받고, R9: 첫 차례를 정한다.
    private void closeOpeningIfDone(EventBatch batch) {
        if (table.anyPair() && table.holderCount() > 1) {
            return;
        }
        players.inOrderFromFirst().forEach(player -> finishIfEmpty(player, batch));
        startFirstTurn(batch);
    }

    private void startFirstTurn(EventBatch batch) {
        if (table.holderCount() < 2) {
            return;
        }
        PlayerId drawer = players.firstHolderFrom(players.first(), table::holds);
        PlayerId target = players.nextHolder(drawer, table::holds);
        turns.begin(drawer, target);
        batch.add(OldMaidEvent.start(drawer, target));
    }

    // R8·R14·R26: 손패가 비었고 아직 등수가 없으면 다음 등수로 끝낸다.
    void finishIfEmpty(PlayerId player, EventBatch batch) {
        if (table.holds(player) || players.isOut(player)) {
            return;
        }
        batch.add(OldMaidEvent.finish(player, players.finish(player)));
    }

    // R12~R15·R37: 상대의 index번 카드를 가져와 내 손패 무작위 자리에 끼운다. 뺏긴 상대가 비면 먼저 끝낸다(D5).
    // 그 카드로 짝이 되면 같은 차례에서 짝 버리기 단계(뽑은 사람이 버린다), 아니면 차례를 넘긴다.
    // 카드 가진 사람이 뽑은 사람 하나만 남으면 게임이 끝나므로 그 짝은 서버가 바로 버린다.
    void draw(PlayerId drawer, SlotIndex slot, EventBatch batch) {
        Turn turn = turns.requireDrawer(drawer);
        PlayingCard card = table.takeFrom(turn.target(), slot);
        batch.add(OldMaidEvent.draw(drawer, turn.target()));
        finishIfEmpty(turn.target(), batch);
        boolean paired = table.giveDrawn(drawer, card);
        if (paired && table.holderCount() > 1) {
            turns.awaitDiscard();
            return;
        }
        discardAll(drawer, batch);
        advanceFrom(drawer);
    }

    // R37: 뽑은 사람 손에 짝이 남지 않았으면 차례를 넘긴다(끝냄은 부르는 쪽이 본다).
    private void passAfterDiscard(PlayerId drawer) {
        if (table.hasPair(drawer)) {
            return;
        }
        advanceFrom(drawer);
    }

    // R17~R19: 뽑기 단계의 뽑는 사람 신호만, 상대 손패 범위 안(또는 "고르지 않음")일 때만 받는다.
    boolean peek(PlayerId player, Optional<SlotIndex> slot, Instant now) {
        if (!turns.is(OldMaidStage.DRAW)) {
            return false;
        }
        Turn turn = turns.current();
        if (!turn.isDrawer(player) || !fits(turn.target(), slot)) {
            return false;
        }
        return turns.movePeek(slot, now);
    }

    private boolean fits(PlayerId target, Optional<SlotIndex> slot) {
        return slot.map(index -> index.value() < table.sizeOf(target))
                .orElse(true);
    }

    // R22~R24: 카드를 가진 사람이 뽑는 사람이 아닐 때(처음 버리기 단계에는 누구나), 1초에 한 번.
    void shuffle(PlayerId player, Instant now, EventBatch batch) {
        if (!table.holds(player)) {
            throw new BusinessException(ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED);
        }
        turns.useShuffle(player, now);
        table.shuffle(player);
        batch.add(OldMaidEvent.shuffle(player));
    }

    // R25~R27: 손패를 다음 카드 가진 사람에게 넘기고(짝 버림·섞음), 비면 끝내고, 단계·차례를 다시 정한다.
    void forfeit(PlayerId leaver, EventBatch batch) {
        if (!table.holds(leaver)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        List<PlayingCard> cards = table.takeAll(leaver);
        players.forfeit(leaver);
        Optional<PlayerId> receiver = players.nextHolderIfAny(leaver, table::holds);
        batch.add(OldMaidEvent.forfeit(leaver, receiver.orElse(null), cards.size()));
        receiver.ifPresent(player -> handOver(player, cards, batch));
        reseat(batch);
    }

    // R26: 받은 사람이 비면 끝낸다. 처음 버리기 단계의 빈 손은 단계가 끝날 때 R8 순서로 등수를 받는다.
    private void handOver(PlayerId receiver, List<PlayingCard> cards, EventBatch batch) {
        table.giveForfeited(receiver, cards)
                .forEach(pair -> batch.add(OldMaidEvent.pair(receiver, pair)));
        if (turns.isOpening()) {
            return;
        }
        finishIfEmpty(receiver, batch);
    }

    // R27·R36·R37: 처음 버리기 단계면 끝났는지만 본다. 뽑는 사람이 카드를 갖고 있으면 상대만 다시 정하고(짝 버리기 단계에서
    // 넘겨받으며 그 짝이 버려졌으면 차례를 넘긴다), 아니면 그 자리 다음 사람에게 차례를 넘긴다.
    private void reseat(EventBatch batch) {
        if (turns.isOpening()) {
            closeOpeningIfDone(batch);
            return;
        }
        if (table.holderCount() < 2) {
            return;
        }
        PlayerId drawer = turns.current().drawer();
        if (!table.holds(drawer)) {
            advanceFrom(drawer);
            return;
        }
        turns.retarget(players.nextHolder(drawer, table::holds));
        passIfDiscarded(drawer);
    }

    private void passIfDiscarded(PlayerId drawer) {
        if (turns.is(OldMaidStage.DISCARD)) {
            passAfterDiscard(drawer);
        }
    }

    // R35·R38: 시간 초과. 처음 버리기면 모두의 남은 짝을, 뽑기면 무작위 자리 1장을 뽑고(짝이 되면 그 짝도),
    // 짝 버리기면 뽑은 사람의 짝을 대신 버린다. 대신 행동한 사람들을 돌려준다.
    List<PlayerId> autoAct(Random random, EventBatch batch) {
        if (turns.isOpening()) {
            return autoDiscardOpening(batch);
        }
        PlayerId drawer = turns.current().drawer();
        autoDrawIfDrawing(random, batch);
        autoDiscardIfDiscarding(batch);
        return List.of(drawer);
    }

    private List<PlayerId> autoDiscardOpening(EventBatch batch) {
        List<PlayerId> actors = players.inOrderFromFirst()
                .stream()
                .filter(table::hasPair)
                .toList();
        actors.forEach(player -> discardAll(player, batch));
        closeOpeningIfDone(batch);
        return actors;
    }

    private void autoDrawIfDrawing(Random random, EventBatch batch) {
        if (!turns.is(OldMaidStage.DRAW)) {
            return;
        }
        Turn turn = turns.current();
        SlotIndex slot = new SlotIndex(random.nextInt(table.sizeOf(turn.target())));
        draw(turn.drawer(), slot, batch);
    }

    private void autoDiscardIfDiscarding(EventBatch batch) {
        if (!turns.is(OldMaidStage.DISCARD)) {
            return;
        }
        PlayerId drawer = turns.current().drawer();
        discardDrawnPair(drawer, batch);
    }

    boolean canShuffle(PlayerId player) {
        return table.holds(player) && !turns.isDrawer(player);
    }

    // R36·R37: 지금 짝을 골라 버릴 수 있는지(처음 버리기 단계의 모두, 짝 버리기 단계의 뽑은 사람).
    boolean canDiscard(PlayerId player) {
        return table.hasPair(player) && (turns.isOpening() || turns.isDrawer(player));
    }

    // R36: 처음 버리기 단계에서 손에 짝이 남지 않았는지(화면의 "다 버림"). 그 밖의 단계에서는 늘 true.
    boolean openingDone(PlayerId player) {
        return !turns.isOpening() || !table.hasPair(player);
    }

    Optional<SlotIndex> peekSlot() {
        return turns.peekSlot();
    }

    long peekSeq() {
        return turns.peekSeq();
    }

    // R15·R16: 카드 가진 사람이 2명 이상일 때만 from 다음 사람에게 차례를 넘긴다(아니면 게임이 끝난다).
    void advanceFrom(PlayerId from) {
        if (table.holderCount() < 2) {
            return;
        }
        PlayerId next = players.nextHolder(from, table::holds);
        turns.begin(next, players.nextHolder(next, table::holds));
    }

    // R30: 마지막까지 카드를 쥔 한 사람을 넣어 최종 등수를 만든다.
    Ranking ranking() {
        PlayerId lastHolder = players.firstHolderFrom(players.firstSeat(), table::holds);
        return players.rank(lastHolder);
    }

    boolean isOpening() {
        return turns.isOpening();
    }

    OldMaidStage stage() {
        return turns.step().stage();
    }

    PlayerId drawer() {
        return turns.current().drawer();
    }

    PlayerId target() {
        return turns.current().target();
    }

    TurnSeq turnSeq() {
        return turns.step().seq();
    }

    TurnStep step() {
        return turns.step();
    }

    long holderCount() {
        return table.holderCount();
    }

    boolean holds(PlayerId player) {
        return table.holds(player);
    }

    boolean isParticipant(PlayerId player) {
        return players.isSeated(player) && !players.hasForfeited(player);
    }

    List<PlayingCard> handOf(PlayerId player) {
        return table.cardsOf(player);
    }

    int cardCount(PlayerId player) {
        return table.sizeOf(player);
    }

    Optional<FinishRank> finishRankOf(PlayerId player) {
        return players.rankOf(player);
    }

    boolean hasForfeited(PlayerId player) {
        return players.hasForfeited(player);
    }

    List<PlayerId> seats() {
        return players.seats();
    }

    int discardCount() {
        return table.discardCount();
    }

    List<CardPair> recentPairs(int limit) {
        return table.recentPairs(limit);
    }

    List<DiscardedPair> discards() {
        return table.discards();
    }
}
