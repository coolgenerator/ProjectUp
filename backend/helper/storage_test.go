package helper

import "testing"

func TestPublicFileURL(t *testing.T) {
	t.Setenv("AWS_REGION", "us-west-1")

	t.Setenv("S3_PUBLIC_BASE_URL", "")
	if got, want := PublicFileURL("projectup", "covers/a.png"), "https://projectup.s3.us-west-1.amazonaws.com/covers/a.png"; got != want {
		t.Errorf("AWS default: got %q, want %q", got, want)
	}

	t.Setenv("S3_PUBLIC_BASE_URL", "http://localhost:9000/projectup/")
	if got, want := PublicFileURL("projectup", "covers/a.png"), "http://localhost:9000/projectup/covers/a.png"; got != want {
		t.Errorf("MinIO: got %q, want %q", got, want)
	}
}

func TestObjectKeyFromURL(t *testing.T) {
	t.Setenv("S3_PUBLIC_BASE_URL", "http://localhost:9000/projectup")

	cases := []struct {
		url    string
		key    string
		isOurs bool
	}{
		{"http://localhost:9000/projectup/papers/1.pdf", "papers/1.pdf", true},
		{"http://localhost:9000/projectup/papers/1.pdf?X-Amz-Signature=abc", "papers/1.pdf", true},
		{"https://projectup.s3.us-west-1.amazonaws.com/papers/1.pdf", "papers/1.pdf", true},
		{"https://projectup.s3.amazonaws.com/avatar/x.png", "avatar/x.png", true},
		{"https://arxiv.org/pdf/2401.00001.pdf", "", false},
		{"http://localhost:9000/other-bucket/x.pdf", "", false},
	}
	for _, c := range cases {
		key, ok := ObjectKeyFromURL(c.url)
		if key != c.key || ok != c.isOurs {
			t.Errorf("ObjectKeyFromURL(%q) = (%q, %v), want (%q, %v)", c.url, key, ok, c.key, c.isOurs)
		}
	}
}
