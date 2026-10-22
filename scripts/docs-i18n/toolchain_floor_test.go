package main

import (
	"os"
	"os/exec"
	"testing"
)

func TestGoToolchainMeetsTrustStoreFloor(t *testing.T) {
	script := "../docker/ensure-go-floor.sh"
	if _, err := os.Stat(script); err != nil {
		t.Fatalf("go floor script missing: %v", err)
	}
	cmd := exec.Command("/bin/sh", script)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Go toolchain is below the CVE-2026-111943 floor: %v\n%s", err, out)
	}
}
