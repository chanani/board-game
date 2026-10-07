package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidSessionTest.discard;
import static com.boardgame.oldmaid.OldMaidSessionTest.draw;
import static com.boardgame.oldmaid.OldMaidSessionTest.peek;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidViewTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-07T00:00:00Z"));

    // A: 스페이드 3·4(id 2, 3), B: 하트 3·조커(id 15, 52), C: 클로버 7·다이아몬드 8(id 45, 33). A가 B에게서 뽑을 차례.
    private OldMaidSession session() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.THREE), s(Rank.FOUR)),
                List.of(h(Rank.THREE), JOKER),
                List.of(c(Rank.SEVEN), d(Rank.EIGHT))));
        return new OldMaidSession(List.of(1L, 2L, 3L), game, clock);
    }

    private JsonNode json(OldMaidSession session, long viewer) {
        return mapper.valueToTree(session.viewFor(viewer));
    }

    // JSON 트리 어디에 있든 카드 객체(rank 칸이 있는 객체)의 id를 모은다.
    private static List<Integer> cardIds(JsonNode node) {
        List<Integer> ids = new ArrayList<>();
        collect(node, ids);
        return ids;
    }

    private static void collect(JsonNode node, List<Integer> ids) {
        if (node.isObject() && node.has("rank") && node.has("id") && node.has("suit")) {
            ids.add(node.get("id").asInt());
        }
        node.forEach(child -> collect(child, ids));
    }

    @Test
    void 숨은_정보_남의_카드_id와_조커는_주인_화면에만_있다() {
        OldMaidSession session = session();
        session.act(1L, draw(0));
        session.act(1L, discard(s(Rank.THREE), h(Rank.THREE)));

        JsonNode owner = json(session, 2L);
        JsonNode other = json(session, 3L);
        JsonNode drawer = json(session, 1L);
        JsonNode spectator = json(session, 99L);

        // A가 하트 3을 뽑아 스페이드 3과 짝을 버렸다: 2·15는 버린 짝으로 공개, 3(A의 스페이드 4)·52(B의 조커)·45·33(C)은 주인만.
        assertThat(cardIds(owner.at("/game/hand"))).containsExactly(52);
        assertThat(cardIds(owner)).containsOnlyOnce(52);
        assertThat(cardIds(owner)).doesNotContain(3, 45, 33);
        assertThat(cardIds(other)).doesNotContain(52, 3);
        assertThat(cardIds(drawer)).doesNotContain(52, 45, 33);
        assertThat(cardIds(spectator)).doesNotContain(52, 3, 45, 33);
        assertThat(cardIds(drawer.at("/game/recentPairs"))).containsExactly(2, 15);
        assertThat(cardIds(spectator.at("/game/recentPairs"))).containsExactly(2, 15);
        // 버린 짝 전체 목록(공개 정보): 누가 버렸는지와 두 장.
        for (JsonNode viewer : List.of(owner, other, drawer, spectator)) {
            assertThat(viewer.at("/game/discards").size()).isEqualTo(1);
            assertThat(viewer.at("/game/discards/0/playerId").asLong()).isEqualTo(1L);
            assertThat(cardIds(viewer.at("/game/discards/0/cards"))).containsExactly(2, 15);
        }
        assertThat(other.toString()).doesNotContain("JOKER");
        assertThat(drawer.at("/game/events/0/type").asText()).isEqualTo("PAIR");
        assertThat(cardIds(drawer.at("/game/events/0/cards"))).containsExactly(2, 15);
    }

    @Test
    void R37_숨은_정보_뽑은_카드는_뽑은_사람_화면에만_있고_짝_버리기_단계만_모두에게_보인다() {
        OldMaidSession session = session();
        session.act(1L, draw(0));

        JsonNode drawer = json(session, 1L);
        JsonNode owner = json(session, 2L);
        JsonNode other = json(session, 3L);
        JsonNode spectator = json(session, 99L);

        // A가 B의 하트 3(15)을 뽑아 손에 스페이드 3(2)과 짝이 생겼다. 15·2·3은 A만, 52는 B만 안다.
        assertThat(cardIds(drawer.at("/game/hand"))).containsExactlyInAnyOrder(15, 2, 3);
        for (JsonNode viewer : List.of(owner, other, spectator)) {
            assertThat(cardIds(viewer)).doesNotContain(15, 2, 3);
            assertThat(viewer.at("/game/stage").asText()).isEqualTo("DISCARD");
            assertThat(viewer.at("/game/currentPlayerId").asLong()).isEqualTo(1L);
            assertThat(viewer.at("/game/canDiscard").asBoolean()).isFalse();
            assertThat(viewer.at("/game/events/0/type").asText()).isEqualTo("DRAW");
            assertThat(viewer.at("/game/events/0/cards").size()).isZero();
        }
        assertThat(drawer.at("/game/canDiscard").asBoolean()).isTrue();
        assertThat(drawer.at("/game/players/0/openingDone").asBoolean()).isTrue();
        assertThat(cardIds(other)).doesNotContain(52);
        assertThat(cardIds(drawer)).doesNotContain(52, 45, 33);
        assertThat(drawer.at("/game/deadline").asLong()).isEqualTo(clock.millis() + 15000);
    }

    @Test
    void R36_처음_버리기_단계에는_차례가_없고_남의_손은_장수와_다_버렸는지만_보인다() {
        // A: 스페이드 3·하트 3·스페이드 4(id 2, 15, 3), B: 다이아몬드 9·조커(id 34, 52), C: 클로버 7·다이아몬드 7(id 45, 32).
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.THREE), h(Rank.THREE), s(Rank.FOUR)),
                List.of(d(Rank.NINE), JOKER),
                List.of(c(Rank.SEVEN), d(Rank.SEVEN))));
        OldMaidSession session = new OldMaidSession(List.of(1L, 2L, 3L), game, clock);
        session.act(3L, discard(c(Rank.SEVEN), d(Rank.SEVEN)));

        JsonNode mine = json(session, 1L);
        JsonNode done = json(session, 3L);
        JsonNode spectator = json(session, 99L);

        assertThat(mine.at("/game/status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(mine.at("/game/stage").asText()).isEqualTo("OPENING_DISCARD");
        assertThat(mine.at("/game/currentPlayerId").isNull()).isTrue();
        assertThat(mine.at("/game/targetId").isNull()).isTrue();
        assertThat(mine.at("/game/peek").isNull()).isTrue();
        assertThat(mine.at("/game/turnSeq").asLong()).isZero();
        assertThat(mine.at("/game/deadline").asLong()).isEqualTo(clock.millis() + 30000);
        assertThat(mine.at("/game/canDiscard").asBoolean()).isTrue();
        assertThat(mine.at("/game/canShuffle").asBoolean()).isTrue();
        assertThat(done.at("/game/canDiscard").asBoolean()).isFalse();
        assertThat(spectator.at("/game/canDiscard").asBoolean()).isFalse();
        assertThat(mine.at("/game/players/0/openingDone").asBoolean()).isFalse();
        assertThat(mine.at("/game/players/1/openingDone").asBoolean()).isTrue();
        assertThat(mine.at("/game/players/2/openingDone").asBoolean()).isTrue();
        assertThat(mine.at("/game/players/2/cardCount").asInt()).isZero();
        assertThat(mine.at("/game/players/2/rank").isNull()).isTrue();
        assertThat(cardIds(mine)).doesNotContain(34, 52);
        assertThat(cardIds(spectator)).doesNotContain(2, 15, 3, 34, 52);
        assertThat(cardIds(done.at("/game/discards/0/cards"))).containsExactly(45, 32);
        assertThat(mine.at("/game/events/0/type").asText()).isEqualTo("PAIR");
    }

    @Test
    void 화면_칸과_보는_사람마다_다른_값() {
        OldMaidSession session = session();
        session.signal(1L, peek(1));

        JsonNode mine = json(session, 1L);
        JsonNode target = json(session, 2L);
        JsonNode spectator = json(session, 99L);

        assertThat(mine.get("gameType").asText()).isEqualTo("OLD_MAID");
        assertThat(mine.at("/game/status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(mine.at("/game/currentPlayerId").asLong()).isEqualTo(1L);
        assertThat(mine.at("/game/targetId").asLong()).isEqualTo(2L);
        assertThat(mine.at("/game/turnSeq").asLong()).isEqualTo(1L);
        assertThat(mine.at("/game/stage").asText()).isEqualTo("DRAW");
        assertThat(mine.at("/game/canDiscard").asBoolean()).isFalse();
        assertThat(mine.at("/game/players/1/openingDone").asBoolean()).isTrue();
        assertThat(mine.at("/game/participantIds").toString()).isEqualTo("[1,2,3]");
        assertThat(mine.at("/game/players/1/cardCount").asInt()).isEqualTo(2);
        assertThat(mine.at("/game/players/1/rank").isNull()).isTrue();
        assertThat(mine.at("/game/players/1/forfeited").asBoolean()).isFalse();
        assertThat(mine.at("/game/hand").size()).isEqualTo(2);
        assertThat(mine.at("/game/hand/0/suit").asText()).isEqualTo("SPADES");
        assertThat(mine.at("/game/hand/0/rank").asText()).isEqualTo("THREE");
        assertThat(mine.at("/game/peek/index").asInt()).isEqualTo(1);
        assertThat(mine.at("/game/peek/seq").asLong()).isEqualTo(1L);
        assertThat(mine.at("/game/canShuffle").asBoolean()).isFalse();
        assertThat(target.at("/game/canShuffle").asBoolean()).isTrue();
        assertThat(target.at("/game/hand/1/suit").isNull()).isTrue();
        assertThat(target.at("/game/hand/1/rank").asText()).isEqualTo("JOKER");
        assertThat(spectator.at("/game/hand").isNull()).isTrue();
        assertThat(spectator.at("/game/canShuffle").asBoolean()).isFalse();
        assertThat(mine.at("/game/deadline").asLong()).isEqualTo(clock.millis() + 15000);
        assertThat(mine.at("/game/result").isNull()).isTrue();
    }

    @Test
    void 끝낸_사람은_빈_손패와_등수를_받고_끝나면_결과와_도둑을_받는다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        OldMaidSession session = new OldMaidSession(List.of(1L, 2L), game, clock);

        session.act(1L, draw(0));
        session.act(1L, discard(s(Rank.FIVE), h(Rank.FIVE)));
        JsonNode view = json(session, 1L);

        assertThat(view.at("/game/status").asText()).isEqualTo("GAME_OVER");
        assertThat(view.at("/game/hand").size()).isZero();
        assertThat(view.at("/game/currentPlayerId").isNull()).isTrue();
        assertThat(view.at("/game/targetId").isNull()).isTrue();
        assertThat(view.at("/game/peek").isNull()).isTrue();
        assertThat(view.at("/game/stage").isNull()).isTrue();
        assertThat(view.at("/game/canDiscard").asBoolean()).isFalse();
        assertThat(view.at("/game/deadline").isNull()).isTrue();
        assertThat(view.at("/game/players/0/rank").asInt()).isEqualTo(1);
        assertThat(view.at("/game/players/1/rank").asInt()).isEqualTo(2);
        assertThat(view.at("/game/winnerId").asLong()).isEqualTo(1L);
        assertThat(view.at("/game/result/reason").asText()).isEqualTo("NORMAL");
        assertThat(view.at("/game/result/thiefId").asLong()).isEqualTo(2L);
        assertThat(view.at("/game/result/ranking/1/placement").asText()).isEqualTo("THIEF");
        assertThat(view.at("/game/result/ranking/1/rank").asInt()).isEqualTo(2);
        assertThat(view.at("/game/discardCount").asInt()).isEqualTo(2);
    }

    @Test
    void 기권한_사람의_화면에는_손패가_없다() {
        OldMaidSession session = session();
        session.forfeit(3L);

        JsonNode forfeiter = json(session, 3L);

        assertThat(forfeiter.at("/game/hand").isNull()).isTrue();
        assertThat(forfeiter.at("/game/players/2/forfeited").asBoolean()).isTrue();
        assertThat(cardIds(forfeiter)).doesNotContain(45, 33, 52, 3);
    }

    @Test
    void 끝난_게임도_관전자는_등수와_결과를_받고_손패는_없다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        OldMaidSession session = new OldMaidSession(List.of(1L, 2L), game, clock);
        session.act(1L, draw(0));
        session.act(1L, discard(s(Rank.FIVE), h(Rank.FIVE)));

        JsonNode spectator = json(session, 99L);

        assertThat(spectator.at("/game/hand").isNull()).isTrue();
        assertThat(spectator.at("/game/players/0/rank").asInt()).isEqualTo(1);
        assertThat(spectator.at("/game/result/thiefId").asLong()).isEqualTo(2L);
        assertThat(cardIds(spectator)).doesNotContain(52);
    }
}
