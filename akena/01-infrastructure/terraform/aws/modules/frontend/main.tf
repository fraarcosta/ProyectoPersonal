locals {
  bucket_name  = "${var.project}-frontend-${var.environment}"
  s3_origin_id = "${var.project}-frontend-${var.environment}-origin"
}

# ── S3 Bucket ─────────────────────────────────────────────────────────────────
# Private bucket — public access is fully blocked.
# CloudFront reads objects via Origin Access Control (OAC), not direct public URLs.

resource "aws_s3_bucket" "frontend" {
  bucket = local.bucket_name
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    # Versioning costs money on dev (extra versions accumulate); enable only on prod.
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

# ── Origin Access Control (OAC) ───────────────────────────────────────────────
# OAC is the modern replacement for Origin Access Identity (OAI).
# It signs requests with SigV4 so S3 can verify the origin is this distribution.

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = local.bucket_name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Bucket Policy — allow CloudFront OAC reads ────────────────────────────────

data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    sid     = "AllowCloudFrontOAC"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json

  # The policy references the distribution ARN, so the distribution must exist first.
  depends_on = [aws_cloudfront_distribution.frontend]
}

# ── CloudFront Distribution ───────────────────────────────────────────────────
# PriceClass_100 → EU + NA edge locations only (cheapest; covers target audience).
# HTTPS only — HTTP requests are redirected to HTTPS.
# Cache policy: AWS managed CachingOptimized (ID below) — best for S3 static sites.

resource "aws_cloudfront_distribution" "frontend" {
  comment             = "Akena frontend SPA — ${var.environment}"
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  tags                = var.tags

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS managed CachingOptimized policy — 1-year TTL, compresses responses,
    # does not forward query strings or cookies. Ideal for versioned static assets.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # ── SPA routing — redirect S3 access errors to index.html ──────────────────
  # S3 returns 403 (key not found in private bucket) or 404 for unknown paths.
  # Returning the SPA shell (HTTP 200) lets React Router handle the route client-side.
  # error_caching_min_ttl=10 keeps the error response cached briefly to avoid
  # hammering CloudFront on rapid navigations, without hiding real deploy issues.

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Uses the default CloudFront certificate (*.cloudfront.net domain).
  # To use a custom domain, replace with acm_certificate_arn + ssl_support_method.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
