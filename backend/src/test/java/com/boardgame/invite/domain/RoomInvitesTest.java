package com.boardgame.invite.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.room.domain.RoomCode;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RoomInvitesTest {

    private static final Instant T0 = Instant.parse("2026-10-13T10:00:00Z");
    private static final RoomCode ROOM = new RoomCode("ABCDEF");
    private static final RoomCode OTHER_ROOM = new RoomCode("ZZZZZZ");
    private static final long ALICE = 1L;
    private static final long BOB = 2L;
    private static final long CAROL = 3L;

    private final RoomInvites invites = new RoomInvites();

    private InviteRoute route(long inviterId, long inviteeId, RoomCode code) {
        return new InviteRoute(InviteParties.of(inviterId, inviteeId), code);
    }

    @Test
    void 낸_초대는_30초_동안만_찾을_수_있다() {
        RoomInvite invite = invites.issue(route(ALICE, BOB, ROOM), T0);

        assertThat(invites.find(invite.id(), T0.plus(RoomInvite.LIFETIME).minusMillis(1))).contains(invite);
        assertThat(invites.find(invite.id(), T0.plus(RoomInvite.LIFETIME))).isEmpty();
    }

    @Test
    void 초대_번호는_매번_다르고_초대받은_사람과_방을_기억한다() {
        RoomInvite first = invites.issue(route(ALICE, BOB, ROOM), T0);
        RoomInvite second = invites.issue(route(ALICE, CAROL, ROOM), T0);

        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(first.invites(BOB, ROOM)).isTrue();
        assertThat(first.invites(CAROL, ROOM)).isFalse();
        assertThat(first.invites(BOB, OTHER_ROOM)).isFalse();
        assertThat(first.inviterId()).isEqualTo(ALICE);
    }

    @Test
    void 같은_친구는_10초가_지나야_다시_부를_수_있다() {
        invites.issue(route(ALICE, BOB, ROOM), T0);

        assertError(() -> invites.issue(route(ALICE, BOB, ROOM), T0.plus(RoomInvite.COOLDOWN).minusMillis(1)),
                ErrorCode.INVITE_TOO_FAST);
        assertError(() -> invites.issue(route(ALICE, BOB, OTHER_ROOM), T0.plusSeconds(1)),
                ErrorCode.INVITE_TOO_FAST);

        invites.issue(route(ALICE, BOB, ROOM), T0.plus(RoomInvite.COOLDOWN));
    }

    @Test
    void 다른_친구나_다른_사람의_초대는_막지_않는다() {
        invites.issue(route(ALICE, BOB, ROOM), T0);

        invites.issue(route(ALICE, CAROL, ROOM), T0);
        invites.issue(route(CAROL, BOB, ROOM), T0);
        invites.issue(route(BOB, ALICE, ROOM), T0);
    }

    @Test
    void 다시_부르면_앞선_초대는_새_초대로_바뀐다() {
        RoomInvite first = invites.issue(route(ALICE, BOB, ROOM), T0);
        Instant later = T0.plus(RoomInvite.COOLDOWN);

        RoomInvite second = invites.issue(route(ALICE, BOB, ROOM), later);

        assertThat(invites.find(first.id(), later)).isEmpty();
        assertThat(invites.find(second.id(), later)).contains(second);
    }

    @Test
    void 지운_초대는_찾을_수_없다() {
        RoomInvite invite = invites.issue(route(ALICE, BOB, ROOM), T0);

        invites.remove(invite.id());

        assertThat(invites.find(invite.id(), T0)).isEmpty();
    }

    @Test
    void 나를_초대하거나_친구_번호가_없으면_잘못된_입력이다() {
        assertError(() -> InviteParties.of(ALICE, ALICE), ErrorCode.INVALID_INPUT);
        assertError(() -> InviteParties.of(ALICE, null), ErrorCode.INVALID_INPUT);
    }
}
