package com.boardgame.oldmaid;

import java.util.List;
import java.util.Optional;

// 한 판의 애그리거트. 차례 규칙은 모두 여기 있다.
public class OldMaidRound {

    private final OldMaidTable table;
    private final OldMaidPlayers players;
    private final TurnState turns;

    private OldMaidRound(OldMaidTable table, OldMaidPlayers players, TurnState turns) {
        this.table = table;
        this.players = players;
        this.turns = turns;
    }

    // R6~R9: 나눈 짝을 공개하고, 빈 손을 끝내고, 첫 차례를 정한다.
    static OldMaidRound begin(Seats seats, Deal deal, OldMaidDice dice, EventBatch batch) {
        OldMaidTable table = new OldMaidTable(deal.hands(), new DiscardPile(), dice);
        OldMaidPlayers players = new OldMaidPlayers(seats);
        PlayerId drawer = players.firstHolderFrom(deal.first(), table::holds);
        PlayerId target = players.nextHolder(drawer, table::holds);
        OldMaidRound round = new OldMaidRound(table, players, new TurnState(new Turn(drawer, target, TurnSeq.first())));
        batch.add(OldMaidEvent.start(drawer, target));
        deal.pairs().forEach((player, pairs) -> round.revealDealt(player, pairs, batch));
        players.inOrderFrom(deal.first()).forEach(player -> round.finishIfEmpty(player, batch));
        return round;
    }

    private void revealDealt(PlayerId player, List<CardPair> pairs, EventBatch batch) {
        table.discard(pairs);
        batch.add(OldMaidEvent.dealPairs(player, pairs));
    }

    // R8·R14·R26: 손패가 비었고 아직 등수가 없으면 다음 등수로 끝낸다.
    void finishIfEmpty(PlayerId player, EventBatch batch) {
        if (table.holds(player) || players.isOut(player)) {
            return;
        }
        batch.add(OldMaidEvent.finish(player, players.finish(player)));
    }

    // R12~R15: 상대의 index번 카드를 가져와 짝이면 버리고, 빈 사람을 끝내고(상대 먼저, D5), 차례를 넘긴다.
    void draw(PlayerId drawer, SlotIndex slot, EventBatch batch) {
        Turn turn = turns.requireDrawer(drawer);
        PlayingCard card = table.takeFrom(turn.target(), slot);
        batch.add(OldMaidEvent.draw(drawer, turn.target()));
        table.giveDrawn(drawer, card)
                .ifPresent(pair -> batch.add(OldMaidEvent.pair(drawer, pair)));
        finishIfEmpty(turn.target(), batch);
        finishIfEmpty(drawer, batch);
        advanceFrom(drawer);
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

    PlayerId drawer() {
        return turns.current().drawer();
    }

    PlayerId target() {
        return turns.current().target();
    }

    TurnSeq turnSeq() {
        return turns.current().seq();
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
}
