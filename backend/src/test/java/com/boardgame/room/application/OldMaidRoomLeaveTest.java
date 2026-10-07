package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Avatar;
import com.boardgame.oldmaid.OldMaidSessionFactory;
import com.boardgame.oldmaid.OldMaidStatus;
import com.boardgame.oldmaid.PlayingCard;
import com.boardgame.oldmaid.Rank;
import com.boardgame.oldmaid.Suit;
import com.boardgame.oldmaid.view.OldMaidPlayerView;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// R28: 카드를 다 털어 끝낸 사람이 방을 나가면 기권이 아니다. 오류 없이 나가고 남은 사람의 게임은 이어진다.
class OldMaidRoomLeaveTest {

    private static final String CODE = "THIEFL";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long TARGET = 2L;
    private static final long THIRD = 3L;
    private static final long FOURTH = 4L;

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-07T00:00:00Z"));
    private final RoomRegistry registry = new RoomRegistry();
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final OldMaidSessionFactory factory = new OldMaidSessionFactory(clock, cards -> riggedDeck(), bound -> 0);
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(factory)), mock(RoomNotifier.class), new OutcomePublisher(events),
            events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(), new TurnTimer(new FakeTaskScheduler()),
            new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    // 짝을 버린 뒤: 방장 [스페이드 5, 스페이드 6], 2번 [하트 5], 3번 [조커], 4번 [하트 6]. 나머지는 모두 같은 손 안의 짝이다.
    private static List<PlayingCard> riggedDeck() {
        List<List<PlayingCard>> piles = List.of(
                new ArrayList<>(List.of(card(Suit.SPADES, Rank.FIVE), card(Suit.SPADES, Rank.SIX))),
                new ArrayList<>(List.of(card(Suit.HEARTS, Rank.FIVE))),
                new ArrayList<>(List.of(PlayingCard.joker())),
                new ArrayList<>(List.of(card(Suit.HEARTS, Rank.SIX))));
        List<List<PlayingCard>> pairs = pairs();
        IntStream.range(0, pairs.size())
                .forEach(index -> piles.get(index % piles.size()).addAll(pairs.get(index)));
        return IntStream.range(0, 53)
                .mapToObj(index -> piles.get(index % piles.size()).get(index / piles.size()))
                .toList();
    }

    private static List<List<PlayingCard>> pairs() {
        List<List<PlayingCard>> pairs = new ArrayList<>();
        pairs.add(List.of(card(Suit.DIAMONDS, Rank.FIVE), card(Suit.CLUBS, Rank.FIVE)));
        pairs.add(List.of(card(Suit.DIAMONDS, Rank.SIX), card(Suit.CLUBS, Rank.SIX)));
        Rank.STANDARD.stream()
                .filter(rank -> rank != Rank.FIVE && rank != Rank.SIX)
                .forEach(rank -> addFullRank(pairs, rank));
        return pairs;
    }

    private static void addFullRank(List<List<PlayingCard>> pairs, Rank rank) {
        pairs.add(List.of(card(Suit.SPADES, rank), card(Suit.HEARTS, rank)));
        pairs.add(List.of(card(Suit.DIAMONDS, rank), card(Suit.CLUBS, rank)));
    }

    private static PlayingCard card(Suit suit, Rank rank) {
        return PlayingCard.of(suit, rank);
    }

    @BeforeEach
    void startGame() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("도둑잡기 방", GameType.OLD_MAID, 6, null));
        List.of(TARGET, THIRD, FOURTH)
                .forEach(this::joinReady);
        service.start(CODE, HOST);
    }

    private void joinReady(long memberId) {
        service.join(CODE, new LoginMember(memberId, "손님" + memberId), null);
        service.setReady(CODE, memberId, true);
    }

    private OldMaidView viewOf(long memberId) {
        Room room = registry.get(ROOM_CODE);
        return ((OldMaidSessionView) room.viewFor(memberId).orElseThrow()).game();
    }

    @Test
    void R28_끝낸_사람이_방을_나가도_오류가_없고_게임은_이어진다() {
        service.act(CODE, HOST, new GameAction("DRAW", null, null, null, null, null, 0));
        OldMaidPlayerView finished = viewOf(THIRD).players().get(1);
        assertThat(finished.cardCount()).isZero();
        assertThat(finished.rank()).isEqualTo(1);

        service.leave(CODE, TARGET);

        assertThat(registry.get(ROOM_CODE).status()).isEqualTo(RoomStatus.PLAYING);
        OldMaidView view = viewOf(THIRD);
        assertThat(view.status()).isEqualTo(OldMaidStatus.IN_PROGRESS);
        assertThat(view.players().get(1).forfeited()).isFalse();
        assertThat(view.players().get(1).rank()).isEqualTo(1);
        assertThat(view.players().get(0).cardCount()).isEqualTo(1);
    }
}
