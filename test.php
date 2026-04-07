<?php
require __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$batch = \App\Models\ProductBatch::where('sell_price', 1500)->with('product.images')->first();
echo json_encode($batch->toArray(), JSON_PRETTY_PRINT);
