package server

import (
	"context"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func listen(t *testing.T) net.Listener {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	return ln
}

func TestNewConfiguresTimeoutsAndHandler(t *testing.T) {
	h := http.NotFoundHandler()

	srv := New(h)

	assert.NotNil(t, srv.Handler)
	assert.Equal(t, 5*time.Second, srv.ReadHeaderTimeout)
	assert.Equal(t, 10*time.Second, srv.ReadTimeout)
	assert.Equal(t, 10*time.Second, srv.WriteTimeout)
	assert.Equal(t, 60*time.Second, srv.IdleTimeout)
}

func TestRunFinishesInFlightRequestsBeforeShuttingDown(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	srv := New(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		close(entered)
		<-release
		w.WriteHeader(http.StatusOK)
	}))
	ln := listen(t)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- Run(ctx, srv, ln, time.Second) }()

	status := make(chan int, 1)
	go func() {
		res, err := http.Get("http://" + ln.Addr().String())
		if err != nil {
			status <- 0
			return
		}
		res.Body.Close()
		status <- res.StatusCode
	}()
	<-entered
	cancel()
	close(release)

	assert.Equal(t, http.StatusOK, <-status)
	assert.NoError(t, <-done)
}

func TestRunReturnsServeErrorWhenListenerFails(t *testing.T) {
	ln := listen(t)
	require.NoError(t, ln.Close())

	err := Run(context.Background(), New(http.NotFoundHandler()), ln, time.Second)

	assert.ErrorIs(t, err, net.ErrClosed)
}

func TestRunReturnsShutdownErrorWhenDrainTimesOut(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	defer close(release)
	srv := New(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		close(entered)
		<-release
	}))
	ln := listen(t)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- Run(ctx, srv, ln, 10*time.Millisecond) }()
	go func() {
		if res, err := http.Get("http://" + ln.Addr().String()); err == nil {
			res.Body.Close()
		}
	}()
	<-entered

	cancel()

	assert.ErrorIs(t, <-done, context.DeadlineExceeded)
}
