<?
require('lite.php');
$x = $request->get('x');
$y = $request->get('y');
$num = $sql->s("SELECT trainAmount FROM tiles WHERE x = $x AND y = $y");
if ($num == 0) {
	die('{"error": "No troops being trained"}');
}
$sql->q("UPDATE tiles SET numTroops = numTroops + $num, troopOwner = owner, trainAmount = 0, collected = 1 WHERE x = $x AND y = $y");
$sql->q("INSERT INTO log (type, x, y, var1) VALUES ('train', $x, $y, $num)");
echo sql2json($sql->q("SELECT * FROM tiles WHERE x = $x AND y = $y"));
?>